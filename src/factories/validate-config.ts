// NIB-M-FACTORIES — config validation (I-4 fail-closed).
// Called at the top of every factory before any resource allocation.

import { InvalidRequestError } from '../errors/index.js';
import type { AdapterConfig, EmbeddingAdapterConfig } from '../types.js';

/**
 * Validate required fields on AdapterConfig and throw InvalidRequestError
 * for anything malformed. Enforces I-4 fail-closed: no silent acceptance
 * of broken configs.
 */
export function validateAdapterConfig(config: AdapterConfig): void {
  if (config.model === undefined || config.model.length === 0) {
    throw new InvalidRequestError({ message: 'AdapterConfig: model is required' });
  }
  if (config.apiKey === undefined || config.apiKey.length === 0) {
    throw new InvalidRequestError({ message: 'AdapterConfig: apiKey is required' });
  }
  if (config.retry !== undefined) {
    if (config.retry.maxAttempts < 1) {
      throw new InvalidRequestError({
        message: 'AdapterConfig: retry.maxAttempts must be >= 1',
      });
    }
    if (config.retry.backoffBaseMs < 0) {
      throw new InvalidRequestError({
        message: 'AdapterConfig: retry.backoffBaseMs must be >= 0',
      });
    }
    if (config.retry.maxBackoffMs < 0) {
      throw new InvalidRequestError({
        message: 'AdapterConfig: retry.maxBackoffMs must be >= 0',
      });
    }
  }
  if (config.timeout !== undefined) {
    if (config.timeout.perAttemptMs <= 0) {
      throw new InvalidRequestError({
        message: 'AdapterConfig: timeout.perAttemptMs must be > 0',
      });
    }
  }
}

/**
 * Validate required fields on EmbeddingAdapterConfig.
 */
export function validateEmbeddingAdapterConfig(config: EmbeddingAdapterConfig): void {
  if (config.model === undefined || config.model.length === 0) {
    throw new InvalidRequestError({ message: 'EmbeddingAdapterConfig: model is required' });
  }
  if (config.apiKey === undefined || config.apiKey.length === 0) {
    throw new InvalidRequestError({ message: 'EmbeddingAdapterConfig: apiKey is required' });
  }
  if (config.batchSize !== undefined && config.batchSize < 1) {
    throw new InvalidRequestError({
      message: 'EmbeddingAdapterConfig: batchSize must be >= 1',
    });
  }
  if (config.retry !== undefined) {
    if (config.retry.maxAttempts < 1) {
      throw new InvalidRequestError({
        message: 'EmbeddingAdapterConfig: retry.maxAttempts must be >= 1',
      });
    }
    if (config.retry.backoffBaseMs < 0) {
      throw new InvalidRequestError({
        message: 'EmbeddingAdapterConfig: retry.backoffBaseMs must be >= 0',
      });
    }
    if (config.retry.maxBackoffMs < 0) {
      throw new InvalidRequestError({
        message: 'EmbeddingAdapterConfig: retry.maxBackoffMs must be >= 0',
      });
    }
  }
  if (config.timeout !== undefined) {
    if (config.timeout.perAttemptMs <= 0) {
      throw new InvalidRequestError({
        message: 'EmbeddingAdapterConfig: timeout.perAttemptMs must be > 0',
      });
    }
  }
}
