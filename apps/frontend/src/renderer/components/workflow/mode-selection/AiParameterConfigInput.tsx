/**
 * AI Parameter Config Input
 * =========================
 *
 * Component for configuring AI parameters (temperature, max tokens, etc.)
 * Used in workflow nodes that interact with AI models.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '../../ui/slider';
import { cn } from '@/lib/utils';

export interface AiParameterConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

interface AiParameterConfigInputProps {
  value: AiParameterConfig;
  onChange: (config: AiParameterConfig) => void;
  disabled?: boolean;
  className?: string;
}

export const AiParameterConfigInput: React.FC<AiParameterConfigInputProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const handleTemperatureChange = (values: number[]) => {
    onChange({ ...value, temperature: values[0] });
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxTokens = parseInt(e.target.value, 10);
    if (!isNaN(maxTokens)) {
      onChange({ ...value, maxTokens });
    }
  };

  const handleTopPChange = (values: number[]) => {
    onChange({ ...value, topP: values[0] });
  };

  const handleTopKChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const topK = parseInt(e.target.value, 10);
    if (!isNaN(topK)) {
      onChange({ ...value, topK });
    }
  };

  const handleStopSequencesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stopSequences = e.target.value.split(',').map(s => s.trim()).filter(s => s);
    onChange({ ...value, stopSequences });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature">Temperature</Label>
          <span className="text-sm text-muted-foreground">
            {value.temperature?.toFixed(2) ?? '1.00'}
          </span>
        </div>
        <Slider
          id="temperature"
          min={0}
          max={2}
          step={0.01}
          value={[value.temperature ?? 1]}
          onValueChange={handleTemperatureChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Controls randomness. Lower values make output more focused and deterministic.
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label htmlFor="maxTokens">Max Tokens</Label>
        <Input
          id="maxTokens"
          type="number"
          min={1}
          max={100000}
          value={value.maxTokens ?? 4096}
          onChange={handleMaxTokensChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of tokens to generate in the re       </p>
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="topP">Top P</Label>
          <span className="text-sm text-muted-foreground">
            {value.topP?.toFixed(2) ?? '1.00'}
          </span>
        </div>
        <Slider
          id="topP"
          min={0}
          max={1}
          step={0.01}
          value={[value.topP ?? 1]}
          onValueChange={handleTopPChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Nucleus sampling. Consider tokens with top_p probability mass.
        </p>
      </div>

      {/* Top K */}
      <div className="space-y-2">
        <Label htmlFor="topK">Top K</Label>
        <Input
          id="topK"
          type="number"
          min={0}
          max={500}
          value={value.topK ?? 0}
          onChange={handleTopKChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Only sample from the top K options for each subsequent token.
        </p>
      </div>

      {/* Stop Sequences */}
      <div className="space-y-2">
        <Label htmlFor="stopSequences">Stop Sequences</Label>
        <Input
          id="stopSequences"
          type="text"
          placeholder="Enter sequences separated by commas"
          value={value.stopSequences?.join(', ') ?? ''}
          onChange={handleStopSequencesChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Sequences where the API will stop generating further tokens.
        </p>
      </div>
    </div>
  );
};
