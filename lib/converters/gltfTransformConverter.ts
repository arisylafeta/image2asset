import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as fs from 'fs/promises';
import JSZip from 'jszip';

export interface ConversionProgress {
  stage: string;
  progress: number;
}

export interface ConvertedModel {
  obj: string;
  mtl: string;
  textures: Map<string, { name: string; data: Buffer }>;
}

export interface ConversionError {
  type: 'load' | 'parse' | 'export' | 'zip';
  message: string;
  details?: string;
}

/**
 * Convert GLB to high-quality OBJ/MTL with PBR materials using gltf-transform
 */
export async function convertGLBtoOBJ(
  glbPath: string,
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ obj: string; mtl: string; textures: Map<string, { name: string; data: Buffer }> }> {
  onProgress?.({ stage: 'Loading GLB model', progress: 0 });

  try {
    // Initialize gltf-transform IO with all extensions
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS);

    // Try to register draco dependencies if available
    // Using dynamic import with variable to prevent webpack from bundling
    try {
      const dracoModule = 'draco3dgltf';
      const draco = await import(/* webpackIgnore: true */ dracoModule);
      io.registerDependencies({
        'draco3d.decoder': draco,
        'draco3d.encoder': draco
      });
    } catch (error) {
      // Draco not available, continue without it
      console.warn('Draco compression not available, continuing without it');
    }

    onProgress?.({ stage: 'Reading GLB file', progress: 20 });

    // Read GLB file
    const glbBuffer = await fs.readFile(glbPath);

    onProgress?.({ stage: 'Parsing GLB document', progress: 40 });

    // Parse GLB document
    const document = await io.readBinary(new Uint8Array(glbBuffer));

    onProgress?.({ stage: 'Extracting geometry and materials', progress: 60 });

    // Export to OBJ/MTL format
    const { obj, mtl, textures } = await exportToOBJ(document, onProgress);

    onProgress?.({ stage: 'Conversion complete', progress: 100 });

    return { obj, mtl, textures };
  } catch (error) {
    throw {
      type: 'export',
      message: 'Failed to convert GLB to OBJ',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as ConversionError;
  }
}

/**
 * Export glTF document to OBJ/MTL format with proper PBR materials
 */
async function exportToOBJ(
  document: Document,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConvertedModel> {
  onProgress?.({ stage: 'Exporting to OBJ format', progress: 65 });

  const textures = new Map<string, { name: string; data: Buffer }>();
  const materialMap = new Map<number, string>(); // material index -> name
  let objContent = '';
  let mtlContent = '';
  let vertexOffset = 0;
  let texCoordOffset = 0;
  let normalOffset = 0;

  // Extract and process textures first
  const textureDefs = document.getRoot().listTextures();
  const textureMap = new Map<number, string>();

  for (let i = 0; i < textureDefs.length; i++) {
    const texture = textureDefs[i];
    const image = texture.getImage();

    if (image) {
      // Determine file extension from MIME type or default to PNG
      const mimeType = texture.getMimeType();
      let extension = 'png';
      if (mimeType === 'image/jpeg') {
        extension = 'jpg';
      } else if (mimeType === 'image/webp') {
        extension = 'webp';
      }

      const textureName = `texture_${i}.${extension}`;
      textures.set(textureName, { name: textureName, data: Buffer.from(image) });
      textureMap.set(i, textureName);
    }
  }

  onProgress?.({ stage: 'Writing OBJ geometry', progress: 70 });

  // Write OBJ header
  objContent += '# OBJ file exported by gltf-transform\n';
  objContent += `mtllib model.mtl\n\n`;

  // Process all meshes
  const meshes = document.getRoot().listMeshes();

  for (const mesh of meshes) {
    const primitives = mesh.listPrimitives();

    for (const primitive of primitives) {
      const material = primitive.getMaterial();

      // Write material reference
      if (material) {
        const matIndex = document.getRoot().listMaterials().indexOf(material);
        let matName = materialMap.get(matIndex);

        if (!matName) {
          matName = `material_${matIndex}`;
          materialMap.set(matIndex, matName);
          mtlContent += generateMTLMaterial(material, matIndex, textureMap, document);
        }

        objContent += `usemtl ${matName}\n`;
      }

      // Get position attribute
      const position = primitive.getAttribute('POSITION');
      if (!position) continue;

      const positions = position.getArray();
      const vertices: number[][] = [];

      // Write vertex positions
      for (let i = 0; i < position.getCount(); i++) {
        const x = positions![i * 3];
        const y = positions![i * 3 + 1];
        const z = positions![i * 3 + 2];
        objContent += `v ${x} ${y} ${z}\n`;
        vertices.push([vertexOffset + i + 1]);
      }

      // Write texture coordinates if present
      const texcoord = primitive.getAttribute('TEXCOORD_0');
      if (texcoord) {
        const texcoords = texcoord.getArray();
        for (let i = 0; i < texcoord.getCount(); i++) {
          const u = texcoords![i * 2];
          const v = 1 - texcoords![i * 2 + 1]; // Flip V coordinate for OBJ
          objContent += `vt ${u} ${v}\n`;
        }
      }

      // Write normals if present
      const normal = primitive.getAttribute('NORMAL');
      if (normal) {
        const normals = normal.getArray();
        for (let i = 0; i < normal.getCount(); i++) {
          const nx = normals![i * 3];
          const ny = normals![i * 3 + 1];
          const nz = normals![i * 3 + 2];
          objContent += `vn ${nx} ${ny} ${nz}\n`;
        }
      }

      // Write face indices
      const indices = primitive.getIndices();
      if (indices) {
        const indexArray = indices.getArray();
        for (let i = 0; i < indexArray!.length; i += 3) {
          const v1 = indexArray![i] + 1 + vertexOffset;
          const v2 = indexArray![i + 1] + 1 + vertexOffset;
          const v3 = indexArray![i + 2] + 1 + vertexOffset;

          if (texcoord && normal) {
            objContent += `f ${v1}/${v1}/${v1} ${v2}/${v2}/${v2} ${v3}/${v3}/${v3}\n`;
          } else if (texcoord) {
            objContent += `f ${v1}/${v1} ${v2}/${v2} ${v3}/${v3}\n`;
          } else if (normal) {
            objContent += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
          } else {
            objContent += `f ${v1} ${v2} ${v3}\n`;
          }
        }
      } else {
        // No indices, use vertex positions directly
        for (let i = 0; i < position.getCount(); i += 3) {
          const v1 = vertexOffset + i + 1;
          const v2 = vertexOffset + i + 2;
          const v3 = vertexOffset + i + 3;

          if (texcoord && normal) {
            objContent += `f ${v1}/${v1}/${v1} ${v2}/${v2}/${v2} ${v3}/${v3}/${v3}\n`;
          } else if (texcoord) {
            objContent += `f ${v1}/${v1} ${v2}/${v2} ${v3}/${v3}\n`;
          } else if (normal) {
            objContent += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
          } else {
            objContent += `f ${v1} ${v2} ${v3}\n`;
          }
        }
      }

      vertexOffset += position.getCount();
    }
  }

  onProgress?.({ stage: 'OBJ export complete', progress: 85 });

  return { obj: objContent, mtl: mtlContent, textures };
}

/**
 * Generate MTL material definition with PBR properties
 */
function generateMTLMaterial(
  material: import('@gltf-transform/core').Material,
  matIndex: number,
  textureMap: Map<number, string>,
  document: Document
): string {
  const matName = `material_${matIndex}`;
  let mtl = `newmtl ${matName}\n`;

  // Get PBR properties from material
  const baseColorFactor = material.getBaseColorFactor() ?? [1, 1, 1, 1];
  const metallicFactor = material.getMetallicFactor() ?? 0;
  const roughnessFactor = material.getRoughnessFactor() ?? 1;
  const emissiveFactor = material.getEmissiveFactor() ?? [0, 0, 0];

  // Ambient color (usually same as diffuse)
  mtl += `Ka ${baseColorFactor[0]} ${baseColorFactor[1]} ${baseColorFactor[2]}\n`;

  // Diffuse color
  mtl += `Kd ${baseColorFactor[0]} ${baseColorFactor[1]} ${baseColorFactor[2]}\n`;

  // Specular color (approximate from metalness)
  mtl += `Ks ${metallicFactor} ${metallicFactor} ${metallicFactor}\n`;

  // Shininess (inverted roughness)
  mtl += `Ns ${(1 - roughnessFactor) * 128}\n`;

  // Alpha/opacity
  if (baseColorFactor[3] < 1) {
    mtl += `d ${baseColorFactor[3]}\n`;
  }

  // Emissive color
  if (emissiveFactor[0] > 0 || emissiveFactor[1] > 0 || emissiveFactor[2] > 0) {
    mtl += `Ke ${emissiveFactor[0]} ${emissiveFactor[1]} ${emissiveFactor[2]}\n`;
  }

  // Illumination model (2 = Blinn-Phong, 1 = Basic)
  mtl += `illum 2\n`;

  // Add texture maps if present
  const baseColorTexture = material.getBaseColorTexture();
  if (baseColorTexture) {
    const texIndex = documentTextureIndex(baseColorTexture, document);
    if (texIndex !== -1 && textureMap.has(texIndex)) {
      mtl += `map_Kd ${textureMap.get(texIndex)}\n`;
    }
  }

  const normalTexture = material.getNormalTexture();
  if (normalTexture) {
    const texIndex = documentTextureIndex(normalTexture, document);
    if (texIndex !== -1 && textureMap.has(texIndex)) {
      mtl += `map_Bump ${textureMap.get(texIndex)}\n`;
    }
  }

  const metallicTexture = material.getMetallicRoughnessTexture();
  if (metallicTexture) {
    const texIndex = documentTextureIndex(metallicTexture, document);
    if (texIndex !== -1 && textureMap.has(texIndex)) {
      const texName = textureMap.get(texIndex);
      // In glTF, metallicRoughness texture has B=metallic, G=roughness
      // For OBJ we reference the same texture for both maps
      mtl += `map_Pm ${texName}\n`;  // Metalness
      mtl += `map_Pr ${texName}\n`;  // Roughness
    }
  }

  const emissiveTexture = material.getEmissiveTexture();
  if (emissiveTexture) {
    const texIndex = documentTextureIndex(emissiveTexture, document);
    if (texIndex !== -1 && textureMap.has(texIndex)) {
      mtl += `map_Ke ${textureMap.get(texIndex)}\n`;
    }
  }

  const occlusionTexture = material.getOcclusionTexture();
  if (occlusionTexture) {
    const texIndex = documentTextureIndex(occlusionTexture, document);
    if (texIndex !== -1 && textureMap.has(texIndex)) {
      mtl += `map_Ka ${textureMap.get(texIndex)}\n`;  // Ambient occlusion
    }
  }

  mtl += '\n';
  return mtl;
}

/**
 * Helper function to get texture index from the document
 * This properly retrieves the texture index for use with textureMap
 */
function documentTextureIndex(
  texture: import('@gltf-transform/core').Texture | null,
  document: Document
): number {
  if (!texture) return -1;

  const textures = document.getRoot().listTextures();
  return textures.indexOf(texture);
}
