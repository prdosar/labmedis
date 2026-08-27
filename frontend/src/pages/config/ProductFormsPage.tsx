import { productFormsApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function ProductFormsPage() {
  return <ConfigEntityPage entityApi={productFormsApi} entityName="Forme pharmaceutique" entityNamePlural="Formes pharmaceutiques" />
}
