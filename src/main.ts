import fetchShedar from './fetchShedar'
import persePath from './persePath'
import template from './template'

const app = document.getElementById('app') as HTMLDivElement
const canvas = document.createElement('canvas')
// window sizeに合わせる
canvas.width = window.innerWidth
canvas.height = window.innerHeight
app.appendChild(canvas)

async function main() {
// webgpuコンテキストの取得
  const context = canvas.getContext('webgpu') as GPUCanvasContext

  // deviceの取得
  const g_adapter = await navigator.gpu.requestAdapter()
  if (!g_adapter) {
    console.error('WebGPU is not supported on this browser.')
    return
  }
  const g_device = await g_adapter.requestDevice()

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({
    device: g_device,
    format: presentationFormat,
    alphaMode: 'opaque',
  })

  const path = window.location.pathname
  const shaderName: string = persePath(path)[1] || 'hexagram'
  const shaderSource = await fetchShedar(shaderName)

  const handleResize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    template(shaderSource, canvas, g_device, context, presentationFormat)
  }

  const onResize = () => {
    requestAnimationFrame(handleResize)
  }

  window.addEventListener('resize', onResize)

  const handlePrint = () => {
    // canvasの内容を任意の秒数の動画として保存する
    const captureLength = 5 // キャプチャする秒数

    const stream = canvas.captureStream(30) // 30fpsでキャプチャ
    const recorder = new MediaRecorder(stream)
    const chunks: BlobPart[] = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'canvas_capture.webm'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    recorder.start()

    // 5秒後に録画を停止
    setTimeout(() => {
      recorder.stop()
    }, captureLength * 1000)
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'p') {
      handlePrint()
    }
  })

  // 初回実行
  handleResize()
}

main()
