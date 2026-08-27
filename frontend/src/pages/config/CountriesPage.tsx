import { countriesApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function CountriesPage() {
  return <ConfigEntityPage entityApi={countriesApi} entityName="Pays" entityNamePlural="Pays" />
}
