

module.exports = {
  root(context) {
    return context.steps([
      (context, data) => {
        console.log('root 1')
        return context.assign('veggies', 'test', { count: 3 })
      },
      (context, { veggies }) => {
        console.log('root 2', veggies)
      }
    ])
  },

  test(context, { count }) {
    console.log('test')
    return 'potato x' + count
  },
}
