'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { businessConfig } from '@/domain/config/business-config';
import type { PhotoKind } from '@/domain/photo';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { createPhoto } from './upload-photo';

export const photoQueryKeys = {
  all: ['photos'] as const,
  signedUrl: (path: string) => ['photos', 'signed-url', path] as const,
  usage: ['photos', 'usage'] as const,
};

const signedUrlSeconds = businessConfig.photos.signedUrlSeconds;

/**
 * URL firmada para ver una foto privada (R3). Las listas deben pedir la miniatura (`thumbPath`).
 * Se refresca antes de que caduque.
 */
export function useSignedPhotoUrl(path: string | null | undefined) {
  const { storage } = useRepositories();
  return useQuery({
    queryKey: photoQueryKeys.signedUrl(path ?? ''),
    queryFn: async () => unwrap(await storage.signedUrl(path!, signedUrlSeconds)),
    enabled: Boolean(path),
    staleTime: (signedUrlSeconds * 1000) / 2,
  });
}

/** Bytes ocupados por las fotos del usuario (BR-PHO-04). */
export function usePhotoStorageUsage() {
  const { photos } = useRepositories();
  return useQuery({
    queryKey: photoQueryKeys.usage,
    queryFn: async () => unwrap(await photos.totalBytes()),
  });
}

/** Sube una foto genérica (comprimir → subir archivo y miniatura → fila `photo`). Devuelve `Result`. */
export function useCreatePhoto() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { photoId: string; kind: PhotoKind; file: Blob }) => createPhoto(repositories, input),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
    },
  });
  return { createPhoto: mutation.mutateAsync, isPending: mutation.isPending };
}
