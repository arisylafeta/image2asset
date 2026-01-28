import * as THREE from 'three';
import { OBJExporter } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import JSZip from 'jszip';

export interface ConvertedModel {
  obj: string;
  mtl?: string;
  textures: Map<string, { name: string; data: string }>;
}

export interface ConversionError {
  type: 'load' | 'parse' | 'export' | 'zip';
  message: string;
  details?: string;
}

export type ConversionProgress = (stage: string, progress: number) => void;

async function loadGLB(url: string, onProgress?: ConversionProgress): Promise<THREE.Scene> {
  onProgress?.('Loading GLB model', 0);

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf: any) => {
        onProgress?.('Loading GLB model', 100);
        resolve(gltf.scene);
      },
      (xhr: ProgressEvent) => {
        if (xhr.lengthComputable) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress?.('Loading GLB model', percent);
        }
      },
      (error: any) => {
        reject({
          type: 'load',
          message: 'Failed to load GLB model',
          details: error instanceof Error ? error.message : 'Unknown error'
        } as ConversionError);
      }
    );
  });
}

async function exportToOBJ(scene: THREE.Scene, onProgress?: ConversionProgress): Promise<string> {
  onProgress?.('Exporting to OBJ format', 50);

  const exporter = new OBJExporter();
  const result = exporter.parse(scene);

  onProgress?.('Exporting to OBJ format', 100);
  return result;
}

async function extractMaterialsAndTextures(
  scene: THREE.Scene,
  onProgress?: ConversionProgress
): Promise<{ mtl: string; textures: Map<string, { name: string; data: string }> }> {
  onProgress?.('Extracting materials and textures', 0);

  const textures = new Map<string, { name: string; data: string }>();
  let mtlContent = '';
  let materialIndex = 0;

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];

      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial ||
            material instanceof THREE.MeshBasicMaterial ||
            material instanceof THREE.MeshPhongMaterial) {

          const matName = `Material_${materialIndex++}`;
          mtlContent += `newmtl ${matName}\n`;

          mtlContent += `Ka ${material.color?.r || 1} ${material.color?.g || 1} ${material.color?.b || 1}\n`;
          mtlContent += `Kd ${material.color?.r || 1} ${material.color?.g || 1} ${material.color?.b || 1}\n`;
          mtlContent += `Ks ${0.5} ${0.5} ${0.5}\n`;
          mtlContent += `Ns 32\n`;
          mtlContent += `d ${material.opacity || 1}\n`;
          mtlContent += `illum 2\n`;

          if (material.map && material.map.image) {
            const textureName = `texture_${matName}.png`;
            textures.set(textureName, {
              name: textureName,
              data: extractTextureData(material.map)
            });
            mtlContent += `map_Kd ${textureName}\n`;
          }

          if ('normalMap' in material && material.normalMap && material.normalMap.image) {
            const normalName = `normal_${matName}.png`;
            textures.set(normalName, {
              name: normalName,
              data: extractTextureData(material.normalMap)
            });
            mtlContent += `map_Bump ${normalName}\n`;
          }

          mtlContent += '\n';
        }
      });

      onProgress?.('Extracting materials and textures', (materialIndex / scene.children.length) * 100);
    }
  });

  onProgress?.('Extracting materials and textures', 100);
  return { mtl: mtlContent, textures };
}

function extractTextureData(texture: THREE.Texture): string {
  const canvas = document.createElement('canvas');
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  ctx.drawImage(texture.image as HTMLImageElement, 0, 0);
  return canvas.toDataURL('image/png');
}

async function createZipFile(
  obj: string,
  mtl: string,
  textures: Map<string, { name: string; data: string }>,
  modelName: string,
  onProgress?: ConversionProgress
): Promise<Blob> {
  onProgress?.('Creating ZIP file', 0);

  const zip = new JSZip();
  const baseName = modelName.replace(/\.glb$/i, '');

  zip.file(`${baseName}.obj`, obj);
  onProgress?.('Creating ZIP file', 30);

  zip.file(`${baseName}.mtl`, mtl);
  onProgress?.('Creating ZIP file', 60);

  let textureIndex = 0;
  const textureEntries = Array.from(textures.entries());
  for (const [name, { data }] of textureEntries) {
    const base64Data = data.split(',')[1];
    zip.file(name, base64Data, { base64: true });
    textureIndex++;
    onProgress?.('Creating ZIP file', 60 + (textureIndex / textureEntries.length) * 40);
  }

  onProgress?.('Creating ZIP file', 100);
  return await zip.generateAsync({ type: 'blob' });
}

export async function convertGLBtoOBJ(
  glbUrl: string,
  onProgress?: ConversionProgress
): Promise<{ blob: Blob; filename: string }> {
  try {
    onProgress?.('Starting conversion', 0);

    const scene = await loadGLB(glbUrl, onProgress);
    const obj = await exportToOBJ(scene, onProgress);
    const { mtl, textures } = await extractMaterialsAndTextures(scene, onProgress);

    const modelName = glbUrl.split('/').pop() || 'model';
    const blob = await createZipFile(obj, mtl, textures, modelName, onProgress);

    onProgress?.('Conversion complete', 100);
    return { blob, filename: modelName.replace(/\.glb$/i, '') };
  } catch (error) {
    throw error instanceof Error ? {
      type: 'export',
      message: 'Conversion failed',
      details: error.message
    } as ConversionError : error;
  }
}
