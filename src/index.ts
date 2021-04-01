import _ from 'lodash'

function isPercentage(p: Dimension | undefined): p is Percentage {
  return typeof p === 'string' && p[p.length - 1] === '%'
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
  | { top?: number; right?: number; bottom?: number; left?: number }

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
  } else if (_.isObject(padding)) {
    return { top: 0, left: 0, right: 0, bottom: 0, ...padding }
  } else {
    throw new Error(`Unrecognized margin format: ${JSON.stringify(padding)}`)
  }
}

type Percentage = `${string}%`

type Dimension = number | Percentage | 'auto'

export type LayoutNode<Id extends string> = {
  id: Id
  children?: LayoutNode<Id>[]
  width?: Dimension
  height?: Dimension
  direction?: 'row' | 'column'
  padding?: PaddingFormat
}

export type LayoutNodeRoot<Id extends string> = LayoutNode<Id> & {
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
  right: number
  bottom: number
}

type ComputedLayout<Id extends string> = { [k in Id]: LayoutBlock }

const defaultBlockProperties = {
  width: 'auto',
  height: 'auto',
  direction: 'row',
  padding: 0,
  top: 0,
  left: 0,
}

function makeBlocks<Id extends string>(
  nodes: LayoutNode<Id>[],
  rootBlockNondefaulted: LayoutNodeRoot<Id>
): LayoutBlock[] {
  const rootBlock = Object.assign({}, defaultBlockProperties, rootBlockNondefaulted)
  const ids = nodes.map((n) => n.id)
  const padding = buildPadding(rootBlock.padding)
  const availableWidth = rootBlock.width - padding.left - padding.right
  const availableHeight = rootBlock.height - padding.top - padding.bottom
  // make dimensions defaulted
  const defaultedWidths = nodes.map((n) => n.width ?? 'auto')
  const defaultedHeights = nodes.map((n) => n.height ?? 'auto')
  // compute percentages
  const widthsFlexible = defaultedWidths.map((w) =>
    isPercentage(w) ? computePercentage(w, availableWidth) : w
  )
  const heightsFlexible = defaultedHeights.map((h) =>
    isPercentage(h) ? computePercentage(h, availableHeight) : h
  )
  // compute 'auto'
  const widthsNonAuto = widthsFlexible.filter((w) => w !== 'auto')
  const heightsNonAuto = heightsFlexible.filter((w) => w !== 'auto')
  const takenWidth = _.sum(widthsNonAuto)
  const takenHeight = _.sum(heightsNonAuto)
  const countWidthsAuto = nodes.length - widthsNonAuto.length
  const countHeightsAuto = nodes.length - heightsNonAuto.length
  const widthAuto =
    rootBlock.direction === 'column'
      ? availableWidth
      : (availableWidth - takenWidth) / countWidthsAuto
  const heightAuto =
    rootBlock.direction === 'row'
      ? availableHeight
      : (availableHeight - takenHeight) / countHeightsAuto
  // replace 'auto'
  const widths = widthsFlexible.map((w) => (w === 'auto' ? widthAuto : w))
  const heights = heightsFlexible.map((h) => (h === 'auto' ? heightAuto : h))
  // stop abruptly if sizes overflow
  if (rootBlock.direction === 'row' && _.sum(widths) > availableWidth)
    throw new Error(`Block widths are overflowing! ${widths.join('+')} > ${availableWidth}`)
  if (rootBlock.direction === 'column' && _.sum(heights) > availableHeight)
    throw new Error(`Block heights are overflowing! ${heights.join('+')} > ${availableHeight}`)
  // position the elements
  const rootTop = rootBlock.top + padding.top
  const rootLeft = rootBlock.left + padding.left
  let lefts: number[]
  let tops: number[]
  if (rootBlock.direction === 'column') {
    lefts = widths.map(() => rootLeft)
    tops = heights.map((_h, i) => rootTop + _.sum(heights.slice(0, i)))
  } else if (rootBlock.direction === 'row') {
    lefts = widths.map((_w, i) => rootLeft + _.sum(widths.slice(0, i)))
    tops = heights.map(() => rootTop)
  } else {
    throw new Error(`Unexpected LayoutNode direction: ${JSON.stringify(rootBlock.direction)}`)
  }
  // create the blocks
  const blocks = _.times(nodes.length).map<LayoutBlock & { node: LayoutNode<Id> }>((i) => {
    const id = ids[i]
    const node = nodes[i]

    const width = widths[i]
    const height = heights[i]
    const top = tops[i]
    const left = lefts[i]
    const bottom = top + height
    const right = left + width

    return { id, width, height, top, left, bottom, right, node }
  })

  // append their children blocks
  const childrenBlocks = blocks.flatMap((b) =>
    b.node.children !== undefined ? makeBlocks(b.node.children, { ...b.node, ...b }) : []
  )

  return [...blocks, ...childrenBlocks]
}

export function makeLayout<Ids extends string>(root: LayoutNodeRoot<Ids>): ComputedLayout<Ids> {
  const rootBlock: LayoutBlock = {
    left: 0,
    top: 0,
    right: root.width + (root.left ?? 0),
    bottom: root.height + (root.top ?? 0),
    ..._.omit(root, 'children', 'node', 'padding', 'direction'),
  }

  const blocks = root.children ? [rootBlock, ...makeBlocks(root.children, root)] : [rootBlock]
  return _.keyBy(blocks, 'id') as ComputedLayout<Ids>
}
