import { categoriesApi } from '../../api/endpoints'
import { ConfigEntityPage } from './ConfigEntityPage'

export function CategoriesPage() {
  return <ConfigEntityPage entityApi={categoriesApi} entityName="Catégorie" entityNamePlural="Catégories" />
}
