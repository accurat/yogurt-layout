const { makeLayout } = require('../src/index')
const _ = require('lodash')

function removeNodeProperties(layout) {
  return _.mapValues(layout, ({ node, ...block }) => block)
}

it(`works with a simple layout`, () => {
  const layout = makeLayout({
    id: 'root',
    direction: 'column',
    width: 500,
    height: 500,
    padding: [10, 20, 30, 20],
    children: [
      { id: 'title', width: '100%', height: 50 },
      { id: 'content', width: '100%', height: 'auto' },
      { id: 'footer', width: '100%', height: 50 },
    ],
  })

  expect(removeNodeProperties(layout)).toMatchSnapshot()
})

it(`works with an advanced layout`, () => {
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

  expect(removeNodeProperties(layout)).toMatchSnapshot()
})

it(`works with a double-auto layout`, () => {
  const layout = makeLayout({
    id: 'root',
    direction: 'row',
    width: 500,
    height: 500,
    children: [
      { id: 'aside', width: 100, height: '100%' },
      { id: 'content-1', width: 'auto', height: '100%' },
      { id: 'content-2', width: 'auto', height: '100%' },
    ],
  })

  expect(removeNodeProperties(layout)).toMatchSnapshot()
})

it(`errors out when layout has no space`, () => {
  expect(() =>
    makeLayout({
      id: 'root',
      direction: 'column',
      width: 500,
      height: 500,
      children: [
        { id: 'content-1', width: 'auto', height: 500 },
        { id: 'content-2', width: 'auto', height: 1 },
      ],
    })
  ).toThrow(`Block heights are overflowing! 500+1 > 500`)
})
