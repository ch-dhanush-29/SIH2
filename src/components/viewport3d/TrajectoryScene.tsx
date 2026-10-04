import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS, ParameterType } from '../../types/burnIn';

export const TrajectoryScene: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const stats = useBurnInStore((state) => state.stats);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);

  const pcfg = PARAMETER_CONFIGS[parameter];

  // Pick the selected chip + all anomalous chips + a sampled batch of 20 normal chips
  const displayChips = useMemo(() => {
    const selected = chips.find((c) => c.part_id === selectedChipId);
    const anomalies = chips.filter((c) => c.verdict !== 'PASS');
    const normals = chips.filter((c) => c.verdict === 'PASS').slice(0, 25);

    const set = new Set<string>();
    const result = [];

    if (selected) {
      set.add(selected.part_id);
      result.push(selected);
    }
    for (const a of anomalies) {
      if (!set.has(a.part_id)) {
        set.add(a.part_id);
        result.push(a);
      }
    }
    for (const n of normals) {
      if (!set.has(n.part_id)) {
        set.add(n.part_id);
        result.push(n);
      }
    }

    return result;
  }, [chips, selectedChipId]);

  // Coordinate mapping:
  // Z axis: 0h -> -10, 24h -> -6.5, 96h -> 1.5, 168h -> 10
  const timeToZ = (t: number) => ((t / 168) - 0.5) * 20;

  // Y axis: parameter value (0 to staticLimit * 1.2) mapped to [-4, 8]
  const valToY = (v: number) => {
    const maxVal = pcfg.staticLimit * 1.2;
    return (v / maxVal) * 12 - 4;
  };

  const theme = useBurnInStore((state) => state.theme);
  const gridColor1 = theme === 'dark' ? '#00f0ff' : '#0284c7';
  const gridColor2 = theme === 'dark' ? '#1f293d' : '#cbd5e1';

  return (
    <group position={[0, 0, 0]}>
      {/* Time Grid on Floor */}
      <gridHelper args={[24, 24, gridColor1, gridColor2]} position={[0, -4.5, 0]} />

      {/* Checkpoint Time Planes */}
      {[0, 24, 96, 168].map((t) => {
        const z = timeToZ(t);
        const isCurrent = checkpoint === t;
        return (
          <group key={t} position={[0, 0, z]}>
            <mesh position={[0, 2, 0]}>
              <boxGeometry args={[22, 12, 0.05]} />
              <meshBasicMaterial
                color={isCurrent ? '#00f0ff' : '#22324e'}
                transparent
                opacity={isCurrent ? 0.2 : 0.06}
                wireframe
              />
            </mesh>
            <Text
              position={[-10.5, -4, 0]}
              fontSize={0.65}
              color={isCurrent ? '#00f0ff' : '#94a3b8'}
              anchorX="right"
            >
              {`${t}h`}
            </Text>
          </group>
        );
      })}

      {/* Static Datasheet Limit Line in 3D */}
      <Line
        points={[
          [-10, valToY(pcfg.staticLimit), timeToZ(0)],
          [-10, valToY(pcfg.staticLimit), timeToZ(168)],
          [10, valToY(pcfg.staticLimit), timeToZ(168)],
          [10, valToY(pcfg.staticLimit), timeToZ(0)],
        ]}
        color="#ff3366"
        lineWidth={2}
        dashed
        dashScale={2}
        dashSize={0.5}
        gapSize={0.3}
      />
      <Text
        position={[0, valToY(pcfg.staticLimit) + 0.4, timeToZ(84)]}
        fontSize={0.55}
        color="#ff3366"
        anchorX="center"
      >
        {`STATIC SPEC CEILING: ${pcfg.staticLimit} ${pcfg.unit}`}
      </Text>

      {/* Trajectories */}
      {displayChips.map((chip, idx) => {
        const isSelected = chip.part_id === selectedChipId;
        const meas = chip.measurements[parameter];

        // Spatial spread across X-axis based on part row/col
        const posX = ((chip.col % 20) / 10 - 1) * 8;

        // Actual trajectory points (0h -> 24h -> 96h -> 168h)
        const actualPoints: [number, number, number][] = [
          [posX, valToY(meas.v_0h), timeToZ(0)],
          [posX, valToY(meas.v_24h), timeToZ(24)],
          [posX, valToY(meas.v_96h), timeToZ(96)],
          [posX, valToY(meas.v_168h), timeToZ(168)],
        ];

        // Predicted trajectory ghost line from 24h to 168h
        const predictedPoints: [number, number, number][] = [
          [posX, valToY(meas.v_24h), timeToZ(24)],
          [posX, valToY(chip.predicted168h), timeToZ(168)],
        ];

        // Color determination based on theme and verdict
        let strokeColor = theme === 'dark' ? '#00f0ff' : '#0284c7';
        if (chip.verdict === 'HARD_REJECT') strokeColor = theme === 'dark' ? '#ff3366' : '#e11d48';
        else if (chip.verdict === 'EARLY_REJECT') strokeColor = theme === 'dark' ? '#ff00aa' : '#c026d3';
        else if (chip.verdict === 'LATENT_SUSPECT') strokeColor = theme === 'dark' ? '#ffaa00' : '#d97706';

        if (isColorblindMode) {
          if (chip.verdict === 'HARD_REJECT') strokeColor = '#d55e00';
          else if (chip.verdict === 'EARLY_REJECT') strokeColor = '#cc79a7';
          else if (chip.verdict === 'LATENT_SUSPECT') strokeColor = '#e69f00';
          else strokeColor = '#0072b2';
        }

        const lineWidth = isSelected ? 4.5 : chip.verdict !== 'PASS' ? 2.5 : 1.2;
        const opacity = isSelected ? 1.0 : chip.verdict !== 'PASS' ? 0.8 : 0.25;

        // Bead position for current checkpoint
        const currentVal = meas[`v_${checkpoint}h` as keyof typeof meas];
        const beadPos: [number, number, number] = [
          posX,
          valToY(currentVal),
          timeToZ(checkpoint),
        ];

        return (
          <group key={chip.part_id}>
            {/* Measured trajectory tube/line */}
            <Line
              points={actualPoints}
              color={isSelected ? '#00f0ff' : strokeColor}
              lineWidth={lineWidth}
              transparent
              opacity={opacity}
            />

            {/* Ghost predicted extension (from 24h to 168h) for suspects/selected */}
            {(isSelected || chip.verdict !== 'PASS') && (
              <Line
                points={predictedPoints}
                color="#f43f5e"
                lineWidth={lineWidth * 0.9}
                dashed
                dashScale={1.5}
                dashSize={0.4}
                gapSize={0.3}
                transparent
                opacity={0.85}
              />
            )}

            {/* Current checkpoint bead */}
            <mesh position={beadPos}>
              <sphereGeometry args={[isSelected ? 0.35 : 0.18, 16, 16]} />
              <meshBasicMaterial
                color={isSelected ? '#00f0ff' : strokeColor}
              />
            </mesh>

            {isSelected && (
              <Text
                position={[posX, valToY(currentVal) + 0.8, timeToZ(checkpoint)]}
                fontSize={0.5}
                color="#00f0ff"
                anchorX="center"
              >
                {`${chip.part_id}: ${currentVal} ${pcfg.unit}`}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
};
