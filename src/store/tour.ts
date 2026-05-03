import type { TourState } from '@/components/TourGuide/types'
import { defineStore } from 'pinia'
import { PAGE_PATHS, TOUR_VERSION } from '@/config/tourSteps'

interface PageTourState {
  completed: boolean
  completedSteps: number[]
  lastGuideTime?: number
  skipped: boolean
}

export const useTourStore = defineStore('tour', {
  state: (): TourState & { pageTours: Record<string, PageTourState> } => ({
    completed: false,
    completedSteps: [],
    currentStep: 0,
    lastGuideTime: undefined,
    skipped: false,
    version: TOUR_VERSION,
    totalSteps: 6,
    pageTours: {},
  }),

  getters: {
    isCompleted: (state): boolean => state.completed,

    isSkipped: (state): boolean => state.skipped,

    progress: (state): number => {
      if (state.totalSteps === 0)
        return 0
      return Math.round((state.completedSteps.length / state.totalSteps) * 100)
    },

    isPartialCompleted: (state): boolean => {
      return state.completedSteps.length > 0 && !state.completed
    },

    isPageCompleted: state => (pagePath: string): boolean => {
      return state.pageTours[pagePath]?.completed || false
    },

    isPageSkipped: state => (pagePath: string): boolean => {
      return state.pageTours[pagePath]?.skipped || false
    },
  },

  actions: {
    markCompleted() {
      this.completed = true
      this.lastGuideTime = Date.now()
      this.version = TOUR_VERSION
      this.completedSteps = Array.from({ length: this.totalSteps }, (_, i) => i)
    },

    markPageCompleted(pagePath: string) {
      if (!this.pageTours[pagePath]) {
        this.pageTours[pagePath] = {
          completed: false,
          completedSteps: [],
          skipped: false,
        }
      }
      this.pageTours[pagePath].completed = true
      this.pageTours[pagePath].lastGuideTime = Date.now()
    },

    markStepCompleted(stepIndex: number) {
      if (!this.completedSteps.includes(stepIndex)) {
        this.completedSteps.push(stepIndex)
      }
    },

    markPageStepCompleted(pagePath: string, stepIndex: number) {
      if (!this.pageTours[pagePath]) {
        this.pageTours[pagePath] = {
          completed: false,
          completedSteps: [],
          skipped: false,
        }
      }
      if (!this.pageTours[pagePath].completedSteps.includes(stepIndex)) {
        this.pageTours[pagePath].completedSteps.push(stepIndex)
      }
    },

    resetTour() {
      this.completed = false
      this.completedSteps = []
      this.currentStep = 0
      this.skipped = false
      this.lastGuideTime = undefined
      this.pageTours = {}
    },

    resetPageTour(pagePath: string) {
      if (this.pageTours[pagePath]) {
        this.pageTours[pagePath] = {
          completed: false,
          completedSteps: [],
          skipped: false,
        }
      }
    },

    skipTour() {
      this.skipped = true
      this.completed = true
      this.lastGuideTime = Date.now()
      this.version = TOUR_VERSION
    },

    skipPageTour(pagePath: string) {
      if (!this.pageTours[pagePath]) {
        this.pageTours[pagePath] = {
          completed: false,
          completedSteps: [],
          skipped: false,
        }
      }
      this.pageTours[pagePath].skipped = true
      this.pageTours[pagePath].completed = true
      this.pageTours[pagePath].lastGuideTime = Date.now()
    },

    setCurrentStep(stepIndex: number) {
      this.currentStep = stepIndex
    },

    isStepCompleted(stepIndex: number): boolean {
      return this.completedSteps.includes(stepIndex)
    },

    isPageStepCompleted(pagePath: string, stepIndex: number): boolean {
      return this.pageTours[pagePath]?.completedSteps.includes(stepIndex) || false
    },

    shouldShowTour(currentVersion: string): boolean {
      if (this.completed && this.version === currentVersion) {
        return false
      }
      if (this.skipped) {
        return false
      }
      return true
    },

    shouldShowPageTour(pagePath: string, currentVersion: string): boolean {
      if (!this.pageTours[pagePath]) {
        return true
      }

      const pageTour = this.pageTours[pagePath]

      if (pageTour.completed && this.version === currentVersion) {
        return false
      }

      if (pageTour.skipped) {
        return false
      }

      return true
    },

    initPageTour(pagePath: string, totalSteps: number) {
      if (!this.pageTours[pagePath]) {
        this.pageTours[pagePath] = {
          completed: false,
          completedSteps: [],
          skipped: false,
        }
      }
    },

    getAllCompletedPages(): string[] {
      return Object.keys(this.pageTours).filter(
        path => this.pageTours[path].completed,
      )
    },

    getTourProgress(): { completed: number, total: number } {
      const allPages = Object.values(PAGE_PATHS)
      const completedPages = allPages.filter(
        path => this.pageTours[path]?.completed,
      )
      return {
        completed: completedPages.length,
        total: allPages.length,
      }
    },
  },

  persist: {
    key: 'tour-state',
    storage: {
      getItem: (key: string) => uni.getStorageSync(key),
      setItem: (key: string, value: string) => uni.setStorageSync(key, value),
    },
  },
})
