import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Platform } from 'react-native';

import { CANVAS_DOCUMENT_VERSION, type CanvasObject, type InfiniteCanvasNote } from '@/types/note';
import { getCanvasConnectorGeometry } from '@/utils/canvasConnectors';

export type CanvasExportFormat = 'pdf' | 'png' | 'jpeg' | 'markdown' | 'text' | 'omnitask';
export type CanvasExportQuality = 'standard' | 'high' | 'ultra';
export type CanvasPaperSize = 'A4' | 'Letter' | 'Legal';
export type CanvasOrientation = 'portrait' | 'landscape';

export interface CanvasExportOptions {
  format: CanvasExportFormat;
  quality: CanvasExportQuality;
  paperSize: CanvasPaperSize;
  orientation: CanvasOrientation;
  includeBackground: boolean;
  includeGrid: boolean;
  includeTitle: boolean;
  includeDate: boolean;
}

const safeName = (value: string) => (value.trim() || 'OmniTask Canvas').replace(/[<>:"/\\|?*]+/g, '-').slice(0, 80);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, token => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[token]!));
const textObjects = (objects: CanvasObject[]) => [...objects].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x).filter(object => (object.type === 'text' || object.type === 'sticky') && object.content?.trim());

export const serializeCanvasDocument = (note: InfiniteCanvasNote) => JSON.stringify({
  format: 'application/vnd.omnitask.canvas+json',
  version: CANVAS_DOCUMENT_VERSION,
  exportedAt: new Date().toISOString(),
  document: note,
}, null, 2);

export const canvasToPlainText = (note: InfiniteCanvasNote) => textObjects(note.objects).map(object => object.content!.trim()).join('\n\n');
export const canvasToMarkdown = (note: InfiniteCanvasNote) => [`# ${note.title}`, '', ...textObjects(note.objects).map(object => object.type === 'sticky' ? `> ${object.content!.trim().replace(/\n/g, '\n> ')}` : object.content!.trim())].join('\n\n');

const canvasHtml = (note: InfiniteCanvasNote, options: CanvasExportOptions) => {
  const page = options.paperSize === 'A4' ? [794, 1123] : options.paperSize === 'Legal' ? [816, 1344] : [816, 1056];
  const [rawWidth, rawHeight] = options.orientation === 'portrait' ? page : [page[1], page[0]];
  const objects = note.objects;
  const minX = Math.min(0, ...objects.map(object => object.position.x));
  const minY = Math.min(0, ...objects.map(object => object.position.y));
  const maxX = Math.max(rawWidth, ...objects.map(object => object.position.x + object.size.width));
  const maxY = Math.max(rawHeight, ...objects.map(object => object.position.y + object.size.height));
  const scale = Math.min((rawWidth - 64) / Math.max(1, maxX - minX), (rawHeight - 110) / Math.max(1, maxY - minY), 1);
  const render = (object: CanvasObject) => {
    const left = 32 + (object.position.x - minX) * scale; const top = 72 + (object.position.y - minY) * scale;
    const width = object.size.width * scale; const height = object.size.height * scale;
    const common = `position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;transform:rotate(${object.rotation}deg);opacity:${object.style.opacity ?? 1};box-sizing:border-box;`;
    if (object.type === 'drawing' && object.points?.length) {
      const points = object.points.map(point => `${32 + (point.x - minX) * scale},${72 + (point.y - minY) * scale}`).join(' ');
      return `<svg style="position:absolute;inset:0;width:${rawWidth}px;height:${rawHeight}px;overflow:visible"><polyline points="${points}" fill="none" stroke="${object.style.color}" stroke-width="${(object.style.strokeWidth ?? 3) * scale}" stroke-opacity="${object.style.opacity ?? 1}" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
    }
    if (object.type === 'connector') {
      const geometry = getCanvasConnectorGeometry(object, objects);
      if (!geometry) return '';
      const transform = `translate(${32 - minX * scale} ${72 - minY * scale}) scale(${scale})`;
      return `<svg style="position:absolute;inset:0;width:${rawWidth}px;height:${rawHeight}px;overflow:visible"><g transform="${transform}"><path d="${geometry.path}" fill="none" stroke="${object.style.color}" stroke-width="${object.style.strokeWidth ?? 3}" stroke-linecap="round" />${object.connector?.arrowEnd ? `<path d="${geometry.arrowPath}" fill="none" stroke="${object.style.color}" stroke-width="${object.style.strokeWidth ?? 3}" stroke-linecap="round" stroke-linejoin="round" />` : ''}</g></svg>`;
    }
    if (object.type === 'image' && object.imageUri) return `<img src="${escapeHtml(object.imageUri)}" style="${common}object-fit:contain;border-radius:10px" />`;
    if (object.type === 'text' || object.type === 'sticky') return `<div style="${common}padding:${object.type === 'sticky' ? 12 : 2}px;background:transparent;color:${object.style.color};font-size:${(object.style.fontSize ?? 18) * scale}px;font-weight:${object.style.bold ? 700 : 400};font-style:${object.style.italic ? 'italic' : 'normal'};text-decoration:${object.style.underline ? 'underline' : 'none'};white-space:pre-wrap">${escapeHtml(object.content ?? '')}</div>`;
    if (object.type === 'rectangle' || object.type === 'circle') return `<div style="${common}border:2px solid ${object.style.color};background:transparent;border-radius:${object.type === 'circle' ? '50%' : '8px'}"></div>`;
    if (object.type === 'line' || object.type === 'arrow') return `<div style="${common}height:${object.style.strokeWidth ?? 3}px;background:${object.style.color};margin-top:${height / 2}px"></div>`;
    return '';
  };
  const grid = options.includeGrid ? 'background-image:linear-gradient(#00000012 1px,transparent 1px),linear-gradient(90deg,#00000012 1px,transparent 1px);background-size:28px 28px;' : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>@page{size:${options.paperSize} ${options.orientation};margin:0}body{margin:0;font-family:Arial,sans-serif;color:#171717}.page{position:relative;width:${rawWidth}px;height:${rawHeight}px;overflow:hidden;${options.includeBackground ? 'background:#F8F8F5;' : 'background:white;'}${grid}}</style></head><body><div class="page">${options.includeTitle ? `<h1 style="position:absolute;left:32px;top:18px;margin:0;font-size:24px">${escapeHtml(note.title)}</h1>` : ''}${options.includeDate ? `<div style="position:absolute;right:32px;top:26px;color:#666;font-size:12px">${new Date(note.updatedAt).toLocaleString()}</div>` : ''}${objects.map(render).join('')}</div></body></html>`;
};

const writeTextFile = async (name: string, extension: string, contents: string) => {
  const uri = `${FileSystem.cacheDirectory}${safeName(name)}-${Date.now()}.${extension}`;
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
};

export async function exportCanvas(note: InfiniteCanvasNote, options: CanvasExportOptions, captureTarget?: unknown): Promise<string> {
  if (options.format === 'markdown') return writeTextFile(note.title, 'md', canvasToMarkdown(note));
  if (options.format === 'text') return writeTextFile(note.title, 'txt', canvasToPlainText(note));
  if (options.format === 'omnitask') return writeTextFile(note.title, 'omnitask', serializeCanvasDocument(note));
  if (options.format === 'pdf') return (await Print.printToFileAsync({ html: canvasHtml(note, options), base64: false })).uri;
  if (!captureTarget) throw new Error('The canvas is not ready to capture.');
  const scale = options.quality === 'ultra' ? 3 : options.quality === 'high' ? 2 : 1;
  return captureRef(captureTarget as never, { format: options.format === 'jpeg' ? 'jpg' : 'png', quality: options.format === 'jpeg' ? (options.quality === 'standard' ? 0.75 : 0.95) : 1, result: 'tmpfile', width: 1080 * scale });
}

export async function shareCanvasFile(uri: string, format: CanvasExportFormat) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const mimeType = format === 'pdf' ? 'application/pdf' : format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : format === 'markdown' ? 'text/markdown' : format === 'omnitask' ? 'application/json' : 'text/plain';
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Share OmniTask canvas' });
}

const extensionFor = (format: CanvasExportFormat) => format === 'jpeg' ? 'jpg' : format === 'omnitask' ? 'omnitask' : format === 'markdown' ? 'md' : format === 'text' ? 'txt' : format;
const mimeFor = (format: CanvasExportFormat) => format === 'pdf' ? 'application/pdf' : format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : format === 'markdown' ? 'text/markdown' : format === 'omnitask' ? 'application/json' : 'text/plain';

export async function saveCanvasFile(uri: string, format: CanvasExportFormat, title: string): Promise<string> {
  const fileName = `${safeName(title)}-${Date.now()}.${extensionFor(format)}`;
  if (Platform.OS === 'android') {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) throw new Error('Choose a folder to save the exported file.');
    const destination = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, fileName, mimeFor(format));
    const contents = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.writeAsStringAsync(destination, contents, { encoding: FileSystem.EncodingType.Base64 });
    return destination;
  }
  const directory = `${FileSystem.documentDirectory}exports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function printCanvas(note: InfiniteCanvasNote, options: CanvasExportOptions) {
  const uri = await exportCanvas(note, { ...options, format: 'pdf' });
  await Print.printAsync({ uri });
}

export async function saveCanvasThumbnail(canvasId: string, captureTarget: unknown): Promise<string | undefined> {
  try {
    const directory = `${FileSystem.documentDirectory}canvas-thumbnails/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const temporary = await captureRef(captureTarget as never, { format: 'jpg', quality: 0.55, result: 'tmpfile', width: 360 });
    const destination = `${directory}${safeName(canvasId)}.jpg`;
    await FileSystem.deleteAsync(destination, { idempotent: true });
    await FileSystem.copyAsync({ from: temporary, to: destination });
    return destination;
  } catch {
    return undefined;
  }
}
