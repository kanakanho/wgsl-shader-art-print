export default function fetchShedar(shaderName: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/kanakanho/wgsl-shader-art/refs/heads/make-shader/src/shader/out/${shaderName}.wgsl`
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch shader: ${response.statusText}`)
      }
      return response.text()
    })
    .catch((error) => {
      console.error('Error fetching shader:', error)
      throw error
    })
}
