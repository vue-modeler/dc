import { provider } from '../../provider/provider'

/**
 * Returns the root Vue instance bound to the current container.
 *
 * IMPORTANT: must be called only AFTER the plugin has bound the Vue app
 * (i.e. after the root `beforeCreate` mixin has run). Calling it earlier will
 * fail in the descriptor with "Factory has not created model instance".
 */
export const useVueApp = provider(({ dc }) => dc.vueApp)
