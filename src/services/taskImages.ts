import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';
import type { TaskImage } from '../types';

export const MAX_TASK_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_TASK_IMAGES = 12;
const ATTACHMENT_TYPES: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
};

export function validateTaskImage(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ATTACHMENT_TYPES[file.type]?.includes(extension)) {
    return 'Formato não permitido. Use JPG, PNG, WebP, GIF, PDF, DOC, DOCX, XLS ou XLSX.';
  }
  if (file.size === 0) return 'O arquivo está vazio.';
  if (file.size > MAX_TASK_IMAGE_BYTES) return 'Cada arquivo deve ter no máximo 6 MB.';
  return null;
}

/** Files are stored under the uploader UID to enforce owner-only deletes in Storage rules.
 * The Firestore document keeps only the path, not a public download token.
 */
export async function uploadTaskImage(taskId: string, file: File, uid: string): Promise<TaskImage> {
  const validationError = validateTaskImage(file);
  if (validationError) throw new Error(validationError);
  if (!taskId || !uid) throw new Error('Entre novamente antes de anexar imagens.');
  const id = crypto.randomUUID();
  const extension = file.name.split('.').pop()!.toLowerCase();
  const storagePath = `task-images/${taskId}/${uid}/${id}.${extension}`;
  await uploadBytes(ref(storage, storagePath), file, {
    contentType: file.type,
    customMetadata: { uploadedBy: uid },
    cacheControl: 'private,max-age=3600',
  });
  return {
    id,
    name: file.name.replace(/[<>\\/]/g, '').slice(0, 120) || `anexo-${id.slice(0, 8)}`,
    storagePath,
    contentType: file.type,
    size: file.size,
    uploadedBy: uid,
    createdAt: new Date().toISOString(),
  };
}

export async function resolveTaskImageUrl(image: TaskImage): Promise<string> {
  return getDownloadURL(ref(storage, image.storagePath));
}

export async function deleteTaskImageBlob(image: TaskImage): Promise<void> {
  await deleteObject(ref(storage, image.storagePath));
}

export function formatTaskImageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/storage\/unauthorized|permission-denied|storage\/unauthenticated/i.test(message)) {
    return 'O Firebase Storage recusou o acesso. Confira as regras do Storage e sua sessão Google.';
  }
  if (/storage\/bucket-not-found|storage\/project-not-found|storage\/unknown/i.test(message)) {
    return 'Firebase Storage indisponível. Ative o bucket e publique as regras de imagens.';
  }
  if (/storage\/quota-exceeded/i.test(message)) return 'O limite do Firebase Storage foi atingido.';
  if (/storage\/retry-limit-exceeded|storage\/canceled|storage\/network/i.test(message)) {
    return 'Falha de conexão durante o envio. Tente novamente.';
  }
  return message.length <= 170 && !message.includes('{') ? message : 'Não foi possível concluir o anexo. Confira o Storage e tente novamente.';
}
