import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';

export const TrajectoryScene: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const stats = useBurnInStore((state) => state.stats);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);
  const theme = useBurnInStore((state) => state.theme);

  const pcfg = PARAMETER_CONFIGS[parameter];

  // Pick the selected chip + anomalous chips + a clean sample of 12 normal chips
  const displayChips = useMemo(() => {
    const selected = chips.find((c) => c.part_id === selectedChipId);
    const anomalies = chips.filter((c) => c.verdict !== 'PASS').slice(0, 15);
    const normals = chips.filter((c) => c.verdict === 'PASS').slice(0, 12);

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

  // Coordinate mapping
  const timeToZ = (t: number) => ((t / 168) - 0.5) * 18;
  const valToY = (v: number) => {
    const maxVal = pcfg.staticLimit * 1.25;
    return (v / maxVal) * 10 - 3.5;
  };

  const gridColor1 = theme === 'dark' ? '#20D6E8' : '#087EA4';
  const gridColor2 = theme === 'dark' ? '#101C28' : '#CBD5E1';
  const textColor = theme === 'dark' ? '#7D92A5' : '#475569';

  return (
    <group position={[0, 0, 0]}>
      {/* Time Grid on Ground */}
      <gridHelper args={[22, 22, gridColor1, gridColor2]} position={[0, -3.8, 0]} />

      {/* Checkpoint Time Gates (Subtle transparent boundary planes) */}
      {[0, 24, 96, 168].map((t) => {
        const z = timeToZ(t);
        const isCurrent = checkpoint === t;
        return (
          <group key={t} position={[0, 0, z]}>
            <mesh position={[0, 1.5, 0]}>
              <boxGeometry args={[18, 9, 0.02]} />
              <meshBasicMaterial
                color={isCurrent ? (theme === 'dark' ? '#20D6E8' : '#087EA4') : '#1E293B'}
                transparent
                opacity={isCurrent ? 0.12 : 0.03}
                wireframe
              />
            </mesh>
            <Text
              position={[-9.2, -3.4, 0]}
              fontSize={0.34}
              color={isCurrent ? (theme === 'dark' ? '#20D6E8' : '#087EA4') : '#64748B'}
              anchorX="right"
              fillOpacity={0.85}
            >
              {`T+${t}h`}
            </Text>
          </group>
        );
      })}

      {/* Static Datasheet Limit Line in 3D */}
      <Line
        points={[
          [-9, valToY(pcfg.staticLimit), timeToZ(0)],
          [-9, valToY(pcfg.staticLimit), timeToZ(168)],
          [9, valToY(pcfg.staticLimit), timeToZ(168)],
          [9, valToY(pcfg.staticLimit), timeToZ(0)],
        ]}
        color="#FF4268"
        lineWidth={1.5}
        dashed
        dashScale={2}
        dashSize={0.4}
        gapSize={0.25}
      />
      <Text
        position={[0, valToY(pcfg.staticLimit) + 0.3, timeToZ(168)]}
        fontSize={0.32}
        color="#FF4268"
        anchorX="center"
        fillOpacity={0.8}
      >
        {`STATIC LIMIT: ${pcfg.staticLimit} ${pcfg.unit}`}
      </Text>

      {/* Trajectories */}
      {displayChips.map((chip) => {
        const isSelected = chip.part_id === selectedChipId;
        const meas = chip.measurements[parameter];
        const posX = ((chip.col % 20) / 10 - 1) * 7;

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

        // Visual treatment based on verdict and selection
        let strokeColor = theme === 'dark' ? '#20D6E8' : '#087EA4';
        let opacity = 0.2;
        let lineWidth = 1.0;

        if (chip.verdict === 'HARD_REJECT') {
          strokeColor = '#FF4268';
          opacity = 0.55;
          lineWidth = 1.6;
        } else if (chip.verdict === 'EARLY_REJECT') {
          strokeColor = '#FF00AA';
          opacity = 0.65;
          lineWidth = 1.8;
        } else if (chip.verdict === 'LATENT_SUSPECT') {
          strokeColor = '#FFB020';
          opacity = 0.6;
          lineWidth = 1.8;
        }

        if (isSelected) {
          strokeColor = '#FFFFFF';
          opacity = 1.0;
          lineWidth = 3.2;
        }

        return (
          <group key={chip.part_id}>
            {/* Measured burn-in trajectory */}
            <Line
              points={actualPoints}
              color={strokeColor}
              lineWidth={lineWidth}
              transparent
              opacity={opacity}
            />

            {/* AI Extrapolated Runaway Ghost Line */}
            {(chip.verdict !== 'PASS' || isSelected) && (
              <Line
                points={predictedPoints}
                color={chip.verdict === 'HARD_REJECT' || chip.verdict === 'EARLY_REJECT' ? '#FF4268' : '#FFB020'}
                lineWidth={isSelected ? 2.5 : 1.2}
                dashed
                dashScale={3}
                dashSize={0.4}
                gapSize={0.2}
                transparent
                opacity={isSelected ? 0.9 : 0.4}
              />
            )}

            {/* Checkpoint Nodes along selected trajectory */}
            {isSelected && (
              <>
                {actualPoints.map((pt, i) => (
                  <mesh key={i} position={pt}>
                    <sphereGeometry args={[0.22, 16, 16]} />
                    <meshBasicMaterial color="#20D6E8" />
                  </mesh>
                ))}
                <Text
                  position={[actualPoints[1][0], actualPoints[1][1] + 0.5, actualPoints[1][2]]}
                  fontSize={0.32}
                  color="#20D6E8"
                  anchorX="center"
                  fillOpacity={0.95}
                >
                  {`${chip.part_id} @ 24h (+${chip.robustZScore.toFixed(1)}σ)`}
                </Text>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};
