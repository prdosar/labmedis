import { packagingsApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function PackagingsPage() {
  return <ConfigEntityPage entityApi={packagingsApi} entityName="Conditionnement" entityNamePlural="Conditionnements" />
}
