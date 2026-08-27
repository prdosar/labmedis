import { customsRegimesApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function CustomsRegimesPage() {
  return <ConfigEntityPage entityApi={customsRegimesApi} entityName="Régime douanier" entityNamePlural="Régimes douaniers" />
}
