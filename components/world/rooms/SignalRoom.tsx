'use client';

/**
 * THE SIGNAL ROOM — contact.
 *
 * The emptiest room in the building, and the last one anyone should reach. One
 * headline on the far wall, one desk, one lamp, four plates. After five rooms
 * of things to look at, the silence is the design.
 */

import { useMemo } from 'react';
import { Ink, boxEdges, circleXY, circleXZ, rectXZ, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow, LightSpill } from '@/components/sketch/Surface';
import { Bench, FramedWork, WallTitle } from '@/components/world/props';
import { contactHeadlineTexture, contactPlateTexture, roomTitleTexture } from '@/lib/panels';
import { sfx } from '@/lib/audio';
import { CONTACT_HEADLINE, CONTACT_LINKS, CONTACT_NOTE } from '@/data/rooms-content';
import { roomById } from '@/data/world';

/* Room extents, local. */
const W = 14.5;
const HD = 5.6;

export function SignalRoom() {
  const room = roomById('contact');
  const title = useMemo(() => roomTitleTexture(room.roomName, room.index, room.blurb), [room]);
  const headline = useMemo(() => contactHeadlineTexture(CONTACT_HEADLINE, CONTACT_NOTE), []);
  const plates = useMemo(
    () => CONTACT_LINKS.map((l) => ({ link: l, texture: contactPlateTexture(l.label, l.value) })),
    [],
  );

  return (
    <group>
      <WallTitle texture={title} size={[5.4, 2.36]} position={[0.09, 3.0, -2.4]} rotationY={Math.PI / 2} />

      {/* The headline, filling the wall directly opposite the door. It is the
          first and for a moment the only thing in the room. */}
      <mesh position={[W - 0.07, 3.15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[6.4, 4.4]} />
        <meshBasicMaterial map={headline} transparent toneMapped={false} />
      </mesh>

      {/* Contact plates, on a rail along the side wall. Each one opens a real link. */}
      {plates.map((p, i) => (
        <FramedWork
          key={p.link.id}
          id={`contact-${p.link.id}`}
          texture={p.texture}
          size={[2.5, 0.609]}
          position={[5.0 + i * 2.72, 1.92, -HD + 0.08]}
          frame={0.05}
          verb="OPEN"
          label={p.link.label}
          seed={171 + i}
          onSelect={() => {
            sfx.click();
            window.open(p.link.href, p.link.id === 'email' ? '_self' : '_blank', 'noopener,noreferrer');
          }}
        />
      ))}
      <Ink
        strokes={[
          [
            [3.6, 1.48, -HD + 0.06],
            [14.4, 1.48, -HD + 0.06],
          ],
        ]}
        width={1.6}
        wobble={0.006}
        seed={175}
        opacity={0.4}
      />

      {/* A desk with a lamp, angled toward the headline. The only warm light
          in the building. */}
      <group position={[10.6, 0, 3.0]} rotation={[0, -0.58, 0]}>
        <Bench length={2.7} depth={1.25} height={0.76} position={[0, 0, 0]} tint="#ece7db" seed={181} />
        {/* Anglepoise. */}
        <group position={[-0.85, 0.76, -0.1]}>
          <Ink
            strokes={[
              ...circleXZ(0, 0, 0.13, 0.015, 14),
              [
                [0, 0.02, 0],
                [0.12, 0.52, 0.04],
              ],
              [
                [0.12, 0.52, 0.04],
                [0.46, 0.4, 0.16],
              ],
              [
                [0.46, 0.4, 0.16],
                [0.52, 0.3, 0.2],
              ],
              ...circleXY(0.52, 0.28, 0.11, 0.2, 14),
            ]}
            width={2}
            wobble={0.004}
            overshoot={0.012}
            passes={2}
            seed={183}
          />
          <mesh position={[0.52, 0.24, 0.2]}>
            <sphereGeometry args={[0.075, 12, 10]} />
            <meshBasicMaterial color="#fffdf4" toneMapped={false} fog={false} />
          </mesh>
        </group>
        {/* A single sheet and a pen. Nothing else. */}
        <group position={[0.5, 0.765, 0.14]} rotation={[0, 0.16, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.45, 0.6]} />
            <meshBasicMaterial color="#fdfbf5" toneMapped={false} />
          </mesh>
          <Ink
            strokes={rectXZ(-0.225, -0.3, 0.45, 0.6, 0.001)}
            width={1.3}
            wobble={0.003}
            seed={185}
            opacity={0.45}
          />
        </group>
        <mesh position={[0.68, 0.775, -0.16]} rotation={[0, 0.7, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.15, 6]} />
          <meshBasicMaterial color="#23201c" toneMapped={false} />
        </mesh>
      </group>

      {/* Light pooling under the lamp, and the desk's shadow. */}
      <LightSpill size={[3.4, 3.0]} position={[10.0, 0.02, 2.7]} opacity={0.34} />
      <GroundShadow size={[3.4, 2.0]} position={[10.6, 0.012, 3.0]} opacity={0.3} seed={187} />

      {/* Two chairs facing each other. An invitation, essentially. */}
      {[
        [7.6, 0.9, 0.5],
        [9.1, -1.2, -2.5],
      ].map(([x, z, rot], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[0.5, 0.055, 0.48]} />
            <meshBasicMaterial color="#eae5d9" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.76, 0.22]}>
            <boxGeometry args={[0.48, 0.58, 0.05]} />
            <meshBasicMaterial color="#e9e3d6" toneMapped={false} />
          </mesh>
          <Ink
            strokes={[
              ...boxEdges(0.5, 0.055, 0.48, 0, 0.44, 0),
              ...boxEdges(0.48, 0.58, 0.05, 0, 0.76, 0.22),
              ...(
                [
                  [-0.21, -0.2],
                  [0.21, -0.2],
                  [-0.21, 0.19],
                  [0.21, 0.19],
                ] as Array<[number, number]>
              ).map(
                ([lx, lz]) =>
                  [
                    [lx, 0.41, lz],
                    [lx, 0, lz],
                  ] as Stroke,
              ),
            ]}
            width={1.7}
            wobble={0.004}
            overshoot={0.014}
            passes={2}
            seed={191 + i}
          />
          <GroundShadow size={[0.85, 0.85]} position={[0, 0.01, 0]} opacity={0.35} seed={195 + i} />
        </group>
      ))}
    </group>
  );
}
