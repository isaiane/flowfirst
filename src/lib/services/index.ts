import { ServiceRegistry } from './types'
import { WebhookService } from './webhook'

export const services: ServiceRegistry = {
  [WebhookService.key]: WebhookService,
}


