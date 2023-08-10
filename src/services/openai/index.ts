import { requestUrl as obsidianRequest, type RequestUrlParam } from 'obsidian'

import {
  Configuration,
  OpenAIApi,
  type CreateChatCompletionResponse
} from 'openai'

import formatChat from './utils/formatChat'

import formatInput from '../../utils/formatInput'

import {
  OPEN_AI_DEFAULT_MODEL,
  OPEN_AI_RESPONSE_TOKENS,
  OPEN_AI_BASE_URL,
  OPEN_AI_DEFAULT_TEMPERATURE
} from './constants'

import { PLUGIN_SETTINGS } from '../../constants'

import type { OpenAICompletionRequest, OpenAICompletion } from './types'
import type { Conversation } from '../conversation'
import type { PluginSettings } from '../../types'
import type Logger from '../logger'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Electron = require('electron')

const {
  remote: { safeStorage }
} = Electron

export const openAICompletion = async (
  {
    input,
    model = OPEN_AI_DEFAULT_MODEL,
    temperature = OPEN_AI_DEFAULT_TEMPERATURE,
    maxTokens = OPEN_AI_RESPONSE_TOKENS,
    topP = 1,
    frequencyPenalty = 0,
    presencePenalty = 0,
    stream = false
  }: OpenAICompletionRequest,
  settings: PluginSettings = PLUGIN_SETTINGS,
  logger: Logger
): Promise<OpenAICompletion | CreateChatCompletionResponse> => {
  const { userHandle, botHandle, openAiApiKey } = settings

  let apiKey = openAiApiKey

  if (safeStorage.isEncryptionAvailable() === true) {
    apiKey = await safeStorage.decryptString(Buffer.from(apiKey))
  }

  // using the openai JavaScript library since the release of the new ChatGPT model
  if (model.adapter?.engine === 'chat') {
    try {
      const config = new Configuration({
        apiKey
      })

      const openai = new OpenAIApi(config)

      const messages = formatChat(input as Conversation)

      const completion = await openai.createChatCompletion({
        model: model.model,
        messages
      })

      return completion.data
    } catch (error) {
      if (typeof error?.response !== 'undefined') {
        logger.error(error.response.status, error.response.data)
      } else {
        logger.error(error.message)
      }

      throw error
    }
  } else {
    // TODO: remove this now that non-chat models are being deprecated
    const requestUrl = new URL('/v1/completions', OPEN_AI_BASE_URL)

    const requestHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const prompt = formatInput(input as string)

    const stopWords: string[] = []

    if (typeof model.stopWord !== 'undefined' && model.stopWord !== '') {
      stopWords.push(model.stopWord)
    }

    if (typeof userHandle !== 'undefined' && userHandle !== '') {
      stopWords.push(userHandle)
    }

    if (typeof botHandle !== 'undefined' && botHandle !== '') {
      stopWords.push(botHandle)
    }

    const requestBody = {
      prompt,
      model: model.model,
      stream,
      temperature,
      max_tokens: maxTokens,
      stop: stopWords,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty
    }

    const request: RequestUrlParam = {
      url: requestUrl.toString(),
      headers: requestHeaders,
      method: 'POST',
      body: JSON.stringify(requestBody),
      throw: false
    }

    try {
      const response = await obsidianRequest(request)

      if (response.status < 400) {
        return response.json
      } else {
        logger.error(response)

        throw new Error(response.text)
      }
    } catch (error) {
      console.error(error)

      throw error
    }
  }
}
