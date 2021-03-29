import _ from 'lodash'

function isNumber(x: unknown): x is number {
  return Number.isFinite(x)
}

function computePercentage(value: string, total: number) {
  if (value[value.length - 1] !== '%') throw new Error(`Percentage has no percentage: "${value}"`)
  const percentage = Number(value.slice(0, -1))
  return total * (percentage / 100)
}

export type PaddingFormat =
  | number
  | [number, number]
  | [number, number, number, number]
  | { top: number; right: number; bottom: number; left: number }

function buildPadding(padding: PaddingFormat) {
  if (typeof padding === 'number') {
    const m = padding
    return { top: m, right: m, bottom: m, left: m }
  } else if (Array.isArray(padding) && padding.length === 2) {
    const [v, h] = padding
    return { top: v, right: h, bottom: v, left: h }
  } else if (Array.isArray(padding)) {
    const [top = 0, right = 0, bottom = 0, left = 0] = padding
    return { top, right, bottom, left }
  } else {
    throw new Error(`Unrecognized margin format: ${JSON.stringify(padding)}`)
  }
}

type Percentage = string

export type LayoutNode = {
  id: string
  children?: LayoutNode[]
  width: number | Percentage | 'auto'
  height: number | Percentage | 'auto'
  direction?: 'row' | 'column'
  padding?: PaddingFormat
}

export type LayoutNodeRoot = LayoutNode & {
  width: number
  height: number
  top?: number
  left?: number
}

export type LayoutBlock = {
  id: string
  width: number
  height: number
  top: number
  left: number
  right?: number
  bottom?: number
}

type Iterate<T, Acc = {}> = T extends [infer Head, ...infer Tail]
  ? Head extends LayoutNode
    ? Iterate<Tail, Acc & ComputedLayout<Head>>
    : Iterate<Tail, Acc>
  : Acc

type Merge<T> = { [K in keyof T]: T[K] }
export type ComputedLayout<T extends LayoutNode> = Merge<
  { [k in T['id']]: LayoutBlock } & Iterate<T['children']>
>

function makeBlocks(nodes: LayoutNode[], rootBlock: LayoutNodeRoot): LayoutBlock[] {
  const ids = nodes.map((n) => n.id)
  const padding = buildPadding(rootBlock.padding || 0)
  const availableWidth = rootBlock.width - padding.left - padding.right
  const availableHeight = rootBlock.height - padding.top - padding.bottom
  // compute percentages
  const widthsFlexible = nodes.map((n) =>
    isNumber(n.width) || n.width === 'auto' ? n.width : computePercentage(n.width, availableWidth)
  )
  const heightsFlexible = nodes.map((n) =>
    isNumber(n.height) || n.height === 'auto'
      ? n.height
      : computePercentage(n.height, availableHeight)
  )
  // compute 'auto'
  const minWidth = _.sumBy(widthsFlexible, (w) => (w === 'auto' ? 0 : w))
  const minHeight = _.sumBy(heightsFlexible, (h) => (h === 'auto' ? 0 : h))
  const widthAuto = availableWidth - minWidth
  const heightAuto = availableHeight - minHeight
  // replace 'auto'
  const widthAutoCount = widthsFlexible.filter((w) => w === 'auto').length
  const heightAutoCount = heightsFlexible.filter((h) => h === 'auto').length
  const widths = widthsFlexible.map((w) => (w === 'auto' ? widthAuto / widthAutoCount : w))
  const heights = heightsFlexible.map((h) => (h === 'auto' ? heightAuto / heightAutoCount : h))
  // stop abruptly if sizes overflow
  if (rootBlock.direction === 'row' && _.sum(widths) > availableWidth)
    throw new Error(`Block widths are overflowing! ${widths.join('+')} > ${availableWidth}`)
  if (rootBlock.direction === 'column' && _.sum(heights) > availableHeight)
    throw new Error(`Block heights are overflowing! ${heights.join('+')} > ${availableHeight}`)
  // position the elements
  const rootTop = (rootBlock?.top ?? 0) + padding.top
  const rootLeft = (rootBlock?.left ?? 0) + padding.left
  let lefts
  let tops
  if (rootBlock.direction === 'column') {
    lefts = widths.map(() => rootLeft)
    tops = heights.map((_h, i) => rootTop + _.sum(heights.slice(0, i)))
  } else if (rootBlock.direction === 'row') {
    lefts = widths.map((_w, i) => rootLeft + _.sum(widths.slice(0, i)))
    tops = heights.map(() => rootTop)
  } else {
    throw new Error(`A node with children must specify a direction`)
  }
  // create the blocks
  const blocks = _.zip<LayoutNode | string | number>(nodes, ids, widths, heights, tops, lefts).map(
    ([node, id, width, height, top, left]) =>
      ({
        id,
        width,
        height,
        top,
        left,
        node,
      } as LayoutBlock & { node: LayoutNode })
  )
  // append their children blocks
  const childrenBlocks = blocks.flatMap((b) =>
    b.node.children !== undefined ? makeBlocks(b.node.children, { ...b.node, ...b }) : []
  )

  return [...blocks, ...childrenBlocks]
}

export function makeLayout<T extends LayoutNode = LayoutNode>(root: T): ComputedLayout<T> {
  const blocks = root.children ? [root, ...makeBlocks(root.children, root as any)] : [root]
  return _.keyBy(blocks, 'id') as ComputedLayout<T>
}
