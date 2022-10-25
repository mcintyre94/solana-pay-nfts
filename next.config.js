module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/mint',
        permanent: true,
      },
    ]
  },
}