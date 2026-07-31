import { PlaygroundApp } from '@/app/PlaygroundApp'
import './styles.css'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Missing #app root')

new PlaygroundApp(root).mount()
