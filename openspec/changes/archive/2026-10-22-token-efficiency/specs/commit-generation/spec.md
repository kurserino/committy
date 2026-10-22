## ADDED Requirements

### Requirement: Output limits for gpt-5 reasoning models
When the selected model is `gpt-5`, `gpt-5-mini` or `gpt-5-nano` (optionally with a date suffix such as `-2025-08-07`), the request SHALL include `reasoning_effort: "minimal"`, `verbosity: "low"` and a `max_completion_tokens` cap. For any other model the request SHALL NOT include these three parameters.

#### Scenario: Default model gets minimal reasoning
- **WHEN** the request is sent with model `gpt-5`
- **THEN** it includes `reasoning_effort` `minimal`, `verbosity` `low` and a `max_completion_tokens` value

#### Scenario: gpt-5 variant gets the same limits
- **WHEN** the request is sent with model `gpt-5-mini`
- **THEN** it includes `reasoning_effort` `minimal`, `verbosity` `low` and a `max_completion_tokens` value

#### Scenario: Other models are untouched
- **WHEN** the request is sent with model `gpt-4o`
- **THEN** it includes none of `reasoning_effort`, `verbosity` and `max_completion_tokens`

### Requirement: Output token cap by line mode
The `max_completion_tokens` cap SHALL be larger in multi-line mode than in one-line mode, and in both modes large enough for a complete message.

#### Scenario: Multi-line cap is larger
- **WHEN** requests are sent for a gpt-5 model in one-line and in multi-line mode
- **THEN** the multi-line request has a greater `max_completion_tokens` than the one-line request

## MODIFIED Requirements

### Requirement: Model selection
The CLI SHALL use the model given by `--model`, falling back to the `COMMITTY_MODEL` environment variable, then to `model` in the project config file, then to `model` in the user config file, and then to `gpt-5-mini`. The model in use SHALL be printed before generation.

#### Scenario: Model from flag
- **WHEN** the user runs `committy --model gpt-4o`
- **THEN** the request is sent with model `gpt-4o` and "Using model: gpt-4o" is printed

#### Scenario: Default model
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set and no config file sets `model`
- **THEN** the request is sent with model `gpt-5-mini`

#### Scenario: Model from config file
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set and `~/.committy` sets `"model": "gpt-5"`
- **THEN** the request is sent with model `gpt-5`
