-- #55 (OQ-43): Safari del iPhone no codifica WebP; las fotos llegan en JPEG cuando el teléfono no sabe WebP. El bucket
-- privado de fotos acepta también image/jpeg (el peso máximo sigue en 1 MB). Las rutas conservan su nombre `.webp`:
-- el formato lo dice el tipo del archivo, no la extensión.
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg'] where id = 'user-photos';
