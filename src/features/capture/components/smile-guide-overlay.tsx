import { StyleSheet, View } from 'react-native';

import { BrandColors } from '@/constants/theme';

type SmileGuideOverlayProps = {
  /**
   * Visible opacity of the guide. The screen fades it up when the
   * user enters the capture mode and pulses it on each status change.
   */
  intensity?: 'soft' | 'active' | 'success';
};

/**
 * A soft "mouth shape" outline drawn with Views. The user is
 * supposed to align their smile into the gap between the upper and
 * lower arcs.
 *
 * No SVG / canvas — pure layout, so it scales to any iPhone size
 * and stays crisp on the simulator.
 */
export function SmileGuideOverlay({ intensity = 'active' }: SmileGuideOverlayProps) {
  const stroke =
    intensity === 'success'
      ? BrandColors.teal
      : intensity === 'soft'
        ? 'rgba(33,184,199,0.35)'
        : 'rgba(33,184,199,0.75)';

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {/* Upper lip arc */}
      <View
        style={[
          styles.upperArc,
          { borderColor: stroke, shadowColor: stroke },
        ]}
      />
      {/* Lower lip arc */}
      <View
        style={[
          styles.lowerArc,
          { borderColor: stroke, shadowColor: stroke },
        ]}
      />
      {/* Center crosshair */}
      <View style={[styles.crossV, { backgroundColor: stroke }]} />
      <View style={[styles.crossH, { backgroundColor: stroke }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upperArc: {
    position: 'absolute',
    width: 240,
    height: 130,
    top: '32%',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    borderWidth: 3,
    borderBottomWidth: 0,
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  lowerArc: {
    position: 'absolute',
    width: 240,
    height: 110,
    top: '46%',
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
    borderWidth: 3,
    borderTopWidth: 0,
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  crossV: {
    position: 'absolute',
    width: 2,
    height: 14,
    top: '50%',
    marginTop: -7,
  },
  crossH: {
    position: 'absolute',
    height: 2,
    width: 14,
    marginLeft: -7,
    left: '50%',
    top: '50%',
  },
});
