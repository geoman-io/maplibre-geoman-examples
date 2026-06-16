import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// Next.js 16 removed `next lint`; linting now runs through the ESLint CLI with
// flat config. This replaces the old `.eslintrc.json` (next/core-web-vitals + next/typescript).
const config = [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
]

export default config
