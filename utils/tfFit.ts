import type * as tf from '@tensorflow/tfjs'
import type { Point } from '~/utils/forecast'

export interface TFFit {
  slope: number
  intercept: number
  epochs: number
  loss: number // final normalized MSE
}

/**
 * Fit y = slope·x + intercept with TensorFlow.js (Adam gradient descent).
 * Client-only — the caller dynamic-imports this and falls back to closed-form
 * OLS if it throws. x and y are normalized for stable training, then the learnt
 * weights are mapped back to raw units so the result is directly comparable.
 */
export async function fitLinearTF(points: Point[], epochs = 300): Promise<TFFit> {
  const tfLib: typeof tf = await import('@tensorflow/tfjs')
  await tfLib.setBackend('cpu')
  await tfLib.ready()

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const xMin = Math.min(...xs)
  const xSpan = Math.max(...xs) - xMin || 1
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length
  const yStd = Math.sqrt(ys.reduce((a, b) => a + (b - yMean) ** 2, 0) / ys.length) || 1

  const nx = tfLib.tensor1d(xs.map(x => (x - xMin) / xSpan))
  const ny = tfLib.tensor1d(ys.map(y => (y - yMean) / yStd))
  const m = tfLib.variable(tfLib.scalar(0))
  const b = tfLib.variable(tfLib.scalar(0))
  const opt = tfLib.train.adam(0.1)

  let loss = 0
  for (let i = 0; i < epochs; i++) {
    const cost = opt.minimize(() => m.mul(nx).add(b).sub(ny).square().mean() as tf.Scalar, true)
    if (cost) {
      loss = cost.dataSync()[0]
      cost.dispose()
    }
  }

  const mn = m.dataSync()[0]
  const bn = b.dataSync()[0]
  // Undo normalization: y = yStd·(mn·(x−xMin)/xSpan + bn) + yMean
  const slope = (yStd * mn) / xSpan
  const intercept = yStd * (bn - (mn * xMin) / xSpan) + yMean

  tfLib.dispose([nx, ny, m, b])
  opt.dispose()

  return { slope, intercept, epochs, loss }
}
