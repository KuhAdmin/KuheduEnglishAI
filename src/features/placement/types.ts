/**
 * The placement test's lists. They are written once, in `@kuhedu/contracts`, because the server
 * keeps a learner's test in the same shapes; here they go by the names this feature uses.
 */
export {
  PLACEMENT_CONFIDENCES as CONFIDENCES,
  PLACEMENT_DEVICE_TYPES as DEVICE_TYPES,
  PLACEMENT_LEVELS as LEVELS,
  PLACEMENT_NOT_ASSESSED_REASONS as NOT_ASSESSED_REASONS,
  PLACEMENT_SKILLS as SKILLS,
  PLACEMENT_SKIP_REASONS as SKIP_REASONS,
  PLACEMENT_STAGES as STAGES,
  PLACEMENT_STATUSES as SESSION_STATUSES,
  PLACEMENT_SUPPORT_LEVELS as SUPPORT_LEVELS,
  PLACEMENT_UNDERSTAND_TYPES as UNDERSTAND_TYPES,
  type PlacementConfidence as Confidence,
  type PlacementDeviceType as DeviceType,
  type PlacementLevel as Level,
  type PlacementNotAssessedReason as NotAssessedReason,
  type PlacementSkill as Skill,
  type PlacementSkipReason as SkipReason,
  type PlacementStage as Stage,
  type PlacementStatus as SessionStatus,
  type PlacementSupportLevel as SupportLevel,
  type PlacementUnderstandType as UnderstandType,
} from '@kuhedu/contracts'
