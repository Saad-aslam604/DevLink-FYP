import React from 'react'
import PageHeader from './PageHeader'

// AdminHeader previously duplicated top-level header + tabs. To reduce
// duplication we'll re-use PageHeader for consistency across admin pages.
// Keep this wrapper so existing imports still work while consolidating the
// canonical header implementation.
const AdminHeader = (props: any) => <PageHeader {...props} />

export default AdminHeader
