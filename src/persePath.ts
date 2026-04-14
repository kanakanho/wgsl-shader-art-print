export default function persePath(path: string): string[] {
  const segments = path.split('/').filter(Boolean)
  return segments
}
