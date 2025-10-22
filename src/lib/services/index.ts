import { ServiceRegistry } from './types'
import { WebhookService } from './webhook'
import { DecisionService } from './decision'
import { FormService } from './form'

export const services: ServiceRegistry = {
  [WebhookService.key]: WebhookService,
  [DecisionService.key]: DecisionService,
  [FormService.key]: FormService,
}


