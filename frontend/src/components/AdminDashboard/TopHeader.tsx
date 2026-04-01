import PageHeader from './PageHeader'

// TopHeader is a lightweight wrapper that re-uses the canonical PageHeader to
// avoid duplicated header code across the admin area. Keep this wrapper so
// older imports still work while centralizing the header implementation.
const TopHeader = (props: any) => <PageHeader {...props} />

export default TopHeader
