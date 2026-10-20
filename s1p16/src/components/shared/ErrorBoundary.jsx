import { Component } from 'react'
import { EmptyState } from './EmptyState.jsx'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.error('Render error:', error)
  }
  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }
  render() {
    if (this.state.error) return <EmptyState message={this.props.message || 'This panel could not be displayed.'} action={String(this.state.error && this.state.error.message)} />
    return this.props.children
  }
}
