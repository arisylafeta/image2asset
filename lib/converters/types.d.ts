declare module 'three/examples/jsm/exporters/OBJExporter' {
  import { Object3D } from 'three';

  export class OBJExporter {
    parse(object: Object3D): string;
  }
}
