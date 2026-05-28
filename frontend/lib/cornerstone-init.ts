import {
  init as csRenderInit,
} from '@cornerstonejs/core';
import {
  init as csToolsInit,
} from '@cornerstonejs/tools';

let initialized = false;

export async function initCornerstone() {
  if (initialized) return;

  // Dynamic import to prevent SSR/Module-eval issues
  const { init: dicomImageLoaderInit } = await import("@cornerstonejs/dicom-image-loader");
  await dicomImageLoaderInit({
    maxWebWorkers: navigator.hardwareConcurrency || 4,
    // @ts-ignore
    webWorkerTaskPaths: [
      'https://unpkg.com/@cornerstonejs/dicom-image-loader@4.15.20/dist/cornerstoneDICOMImageLoaderWebWorker.min.js',
    ],
  });

  // Initialize Core and Tools
  await csRenderInit();
  await csToolsInit();

  initialized = true;
  console.log('Cornerstone initialized');
}
