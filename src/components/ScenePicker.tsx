import { useSceneStore, SCENE_LABELS, type SceneStyle } from '../store/sceneStore';

/** Background/environment selector for the 3D viewport. Persisted to localStorage. */
export default function ScenePicker() {
  const { style, setStyle } = useSceneStore();
  return (
    <select
      className="currency-picker"
      value={style}
      title="Scene background"
      onChange={(e) => setStyle(e.target.value as SceneStyle)}
    >
      {(Object.keys(SCENE_LABELS) as SceneStyle[]).map((s) => (
        <option key={s} value={s}>{SCENE_LABELS[s]}</option>
      ))}
    </select>
  );
}
