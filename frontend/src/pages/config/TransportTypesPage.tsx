import { transportTypesApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function TransportTypesPage() {
  return <ConfigEntityPage entityApi={transportTypesApi} entityName="Type de transport" entityNamePlural="Types de transport" />
}
