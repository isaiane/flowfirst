import { HelloService } from './hello'
import { ServiceRegistry } from './types'
import { WebhookService } from './webhook'
import { DecisionService } from './decision'
import { FormService } from './form'

export const services: ServiceRegistry = {
  [HelloService.key]: HelloService,

  [WebhookService.key]: WebhookService,
  [DecisionService.key]: DecisionService,
  [FormService.key]: FormService,
}


