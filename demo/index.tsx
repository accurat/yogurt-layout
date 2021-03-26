import React from 'react'
import ReactDOM from 'react-dom'
import { makeLayout } from '../src/index'

const layout = makeLayout({
  id: 'root',
  direction: 'column',
  width: 500,
  height: 500,
  padding: 20,
  children: [
    { id: 'title', width: '100%', height: 50 },
    {
      id: 'chart',
      width: '100%',
      height: 'auto',
      direction: 'row',
      padding: 0,
      children: [
        { id: 'left', width: 100, height: '100%' },
        {
          id: 'center-wrapper',
          width: 'auto',
          height: '100%',
          padding: [10, 20],
          direction: 'row',
          children: [{ id: 'center', width: '100%', height: '100%' }],
        },
        { id: 'right', width: 100, height: '100%' },
      ],
    },
    { id: 'legend', width: '100%', height: 150 },
  ],
})

console.log(layout)

function Block({ layout, color }) {
  if (!layout) return null
  return (
    <rect
      fill={color}
      fillOpacity="0.1"
      stroke={color}
      x={layout.left}
      y={layout.top}
      width={layout.width}
      height={layout.height}
    />
  )
}

ReactDOM.render(
  <svg width={500} height={500}>
    <rect width={500} height={500} fill="transparent" stroke="black" />
    <Block color="grey" layout={layout.root} />

    <Block color="darkblue" layout={layout.title} />
    <Block color="white" layout={layout.chart} />
    <Block color="green" layout={layout.legend} />

    <Block color="blue" layout={layout.left} />
    <Block color="red" layout={layout.center} />
    <Block color="purple" layout={layout.right} />
  </svg>,
  document.getElementById('app')
)

// layout === {
//   root: { top, left, right, bottom, width, height },
//   title: { top, left, right, bottom, width, height },
//   chart: { top, left, right, bottom, width, height },
//   legend: { top, left, right, bottom, width, height },
//   ...
// }
