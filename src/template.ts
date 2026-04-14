function buildRenderBundle(
  gpuDevice: GPUDevice,
  pipeline: GPURenderPipeline,
  presentationFormat: GPUTextureFormat,
  uniformBindGroup: GPUBindGroup,
  multiSampleCount: number = 4,
): GPURenderBundle {
  const renderBundleDescriptor: GPURenderBundleEncoderDescriptor = {
    colorFormats: [presentationFormat],
    depthStencilFormat: 'depth24plus',
    sampleCount: multiSampleCount,
  }

  const encoder = gpuDevice.createRenderBundleEncoder(renderBundleDescriptor)
  encoder.setPipeline(pipeline)
  encoder.setBindGroup(0, uniformBindGroup)
  encoder.draw(6, 1, 0, 0)
  return encoder.finish()
}

export default function template(
  shaderSource: string,
  canvas: HTMLCanvasElement,
  gpuDevice: GPUDevice,
  context: GPUCanvasContext,
  presentationFormat: GPUTextureFormat,
  multiSampleCount: number = 4,
) {
  const shaderModule = gpuDevice.createShaderModule({ code: shaderSource })

  // レンダリングパイプラインの作成
  const pipeline = gpuDevice.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
    multisample: {
      count: multiSampleCount,
    },
  })

  // ユニフォームバッファの作成
  // UniformBuffer はシェーダー上でアクセスできる読み取り専用のメモリ領域
  const uniformBuffer = gpuDevice.createBuffer({
    size: 4 * 4, // time, padding, screen_size(x, y)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  // バインドグループの作成
  // BindGroup はシェーダーのリソース（バッファやテクスチャ）をパイプラインに結びつけるためのオブジェクト
  const uniformBindGroup = gpuDevice.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  })

  // MSAA（マルチサンプルアンチエイリアシング）のための設定
  const msaaTexture = gpuDevice.createTexture({
    size: [canvas.width, canvas.height],
    sampleCount: multiSampleCount,
    format: presentationFormat,

    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  })
  const msaaView = msaaTexture.createView()

  // 深度バッファの作成
  // 深度バッファは、物体の前後関係を正しく描画するために使用される
  const depthTexture = gpuDevice.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    sampleCount: multiSampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  })
  const depthView = depthTexture.createView()

  const renderBundle = buildRenderBundle(
    gpuDevice,
    pipeline,
    presentationFormat,
    uniformBindGroup,
    multiSampleCount,
  )

  // フレームごとの描画処理
  function frame() {
    const time = performance.now() * 0.001
    const aspectRatio = canvas.width / Math.max(canvas.height, 1)

    // ユニフォームバッファに行列データを書き込む
    const uniformData = new Float32Array([time, aspectRatio, canvas.width, canvas.height])
    gpuDevice.queue.writeBuffer(uniformBuffer, 0, uniformData)

    // コマンドエンコーダーの作成
    const commandEncoder = gpuDevice.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass({
      // 描画先のテクスチャ
      colorAttachments: [
        {
          view: msaaView,
          resolveTarget: context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      // 深度バッファの設定
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    })

    // レンダーバンドルの実行
    passEncoder.executeBundles([renderBundle])
    passEncoder.end()

    // コマンドの送信
    gpuDevice.queue.submit([commandEncoder.finish()])
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
