import api from '../utils/api'

async function safeGet(path: string) {
  try {
    console.debug('[organizationApi] GET', path)
    const res = await api.get(path)
    console.debug('[organizationApi] RESPONSE', path, res && res.status, res && res.data)
    return res.data
  } catch (err: any) {
    // propagate error to caller with shape
    console.error('[organizationApi] ERROR', path, err && (err.response ? err.response.data : err.message || err))
    throw err
  }
}

export const organizationApi = {
  async getOrganizationData() {
    // try enhanced endpoint first (if ever added)
    try {
      const r = await safeGet(`/organization/enhanced`)
      if (r && r.success) return r.data || r
    } catch (e) {
      // ignore and fallback
    }
    return this.getBasicOrganizationData()
  },

  // Basic organization data: uses organization-scoped endpoints that rely on the authenticated user
  async getBasicOrganizationData() {
    try {
      // fetch projects, team and resources which are organization-scoped (server uses req.user to scope)
      const [projectsRes, teamRes, resourcesRes] = await Promise.all([
        api.get('/organization/projects').catch(e => ({ data: [] })),
        api.get('/organization/team').catch(e => ({ data: [] })),
        api.get('/organization/resources').catch(e => ({ data: [] }))
      ])

      const projects = projectsRes && projectsRes.data && projectsRes.data.data ? projectsRes.data.data : (Array.isArray(projectsRes.data) ? projectsRes.data : [])
      const team = teamRes && teamRes.data && teamRes.data.data ? teamRes.data.data : (Array.isArray(teamRes.data) ? teamRes.data : [])
      const resources = resourcesRes && resourcesRes.data && resourcesRes.data.data ? resourcesRes.data.data : (Array.isArray(resourcesRes.data) ? resourcesRes.data : [])

      // fetch tasks per project
      const taskPromises = (projects || []).map((p: any) => api.get(`/organization/projects/${p._id}/tasks`).then(r => r.data && r.data.data ? r.data.data : (Array.isArray(r.data) ? r.data : [])).catch(() => []))
      const tasksArrays = await Promise.all(taskPromises)
      const tasks = tasksArrays.flat()

      return { projects, tasks, team, resources, analytics: null }
    } catch (err: any) {
      console.error('organizationApi.getBasicOrganizationData error', err && err.message ? err.message : err)
      return { projects: [], tasks: [], team: [], resources: [], analytics: null }
    }
  },

  async getProjectDetails(projectId: string) {
    try {
      const res = await api.get(`/organization/projects/${projectId}/details`)
      return res.data && res.data.data ? res.data.data : res.data
    } catch (err) {
      throw err
    }
  }
}

export default organizationApi
