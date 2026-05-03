export interface TourStep {
  id: string
  target: string
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
  pagePath?: string
  highlightPadding?: number
  highlightBorderRadius?: number
  highlightColor?: string
  beforeEnter?: () => Promise<void>
  afterLeave?: () => Promise<void>
}

export interface TourState {
  completed: boolean
  completedSteps: number[]
  currentStep: number
  lastGuideTime?: number
  skipped: boolean
  version?: string
  totalSteps: number
}

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface HighlightRect {
  x: number
  y: number
  width: number
  height: number
  padding: number
  borderRadius: number
}

export interface TourConfig {
  maskClosable: boolean
  showSkip: boolean
  showPrevious: boolean
  animate: boolean
  maskColor: string
  highlightColor: string
}

export interface TourGuideProps {
  steps: TourStep[]
  show: boolean
  startIndex?: number
  maskClosable?: boolean
  showSkip?: boolean
  showPrevious?: boolean
}

export interface TourMaskProps {
  target: string
  padding?: number
  borderRadius?: number
  maskColor?: string
  highlightColor?: string
  animate?: boolean
}

export interface TourTooltipProps {
  title: string
  content: string
  position: TooltipPosition
  currentStep: number
  totalSteps: number
  showSkip?: boolean
  showPrevious?: boolean
  skipText?: string
  previousText?: string
  nextText?: string
  finishText?: string
  targetRect?: UniApp.NodeInfo
}
