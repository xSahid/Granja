"use client"
import React, { useState, useMemo, createContext, useContext } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Image, Platform, UIManager, LayoutAnimation, KeyboardAvoidingView } from 'react-native';
import { DatabaseQueries } from '../database/offline/queries';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// CONTEXTO GLOBAL DE SECCIÓN

export const SeccionContext = createContext<{
  seccionSeleccionada: string | null;
  setSeccionSeleccionada: (s: string | null) => void;
}>({
  seccionSeleccionada: null,
  setSeccionSeleccionada: () => {},
});

export function useSeccion() {
  return useContext(SeccionContext);
}

const envases = [
  "CAJA TIPO A",
  "SEPARADOR TIPO A",
  "CAJA TIPO B",
  "SEPARADOR TIPO B",
  "CONO",
  "CONO 240 PZS",
  "CONO ESTRELLA",
  "CINTA",
  "CINTA BLANCA",
];
const columnas = ['Existencia Inicial', 'Recibido', 'Consumo'];

export default function EnvaseScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const paramSeccion = (route as any).params?.seccionSeleccionada;
  const { seccionSeleccionada, setSeccionSeleccionada } = useSeccion();

  // Si hay parámetro, actualiza el contexto solo la primera vez
  React.useEffect(() => {
    if (paramSeccion) setSeccionSeleccionada(paramSeccion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramSeccion]);
  // Elimina el estado de fecha y usa siempre la fecha actual en el render
  // const [fecha, setFecha] = useState(() => {
  //   const today = new Date();
  //   return today.toISOString().split('T')[0];
  // });
  const fechaHoy = new Date().toISOString().split('T')[0];

  // Estructura: { [envase]: { existenciaInicial, recibido, consumo, existenciaFinal } }
  const [tabla, setTabla] = useState(() => {
    const obj: any = {};
    envases.forEach(envase => {
      obj[envase] = { existenciaInicial: '', recibido: '', consumo: '', existenciaFinal: '0' };
    });
    return obj;
  });

  // Calcular totales y existencia final
  const totales = useMemo(() => {
    let existenciaInicial = 0, recibido = 0, consumo = 0, existenciaFinal = 0;
    envases.forEach(envase => {
      const inicial = Number(tabla[envase].existenciaInicial) || 0;
      const rec = Number(tabla[envase].recibido) || 0;
      const cons = Number(tabla[envase].consumo) || 0;
      const final = inicial + rec - cons;
      existenciaInicial += inicial;
      recibido += rec;
      consumo += cons;
      existenciaFinal += final;
    });
    return { existenciaInicial, recibido, consumo, existenciaFinal };
  }, [tabla]);

  // Manejar cambios en la tabla
  const handleChange = (envase: string, campo: string, valor: string) => {
    setTabla((prev: any) => {
      const newTabla = {
        ...prev,
        [envase]: {
          ...prev[envase],
          [campo]: valor.replace(/[^0-9.]/g, '')
        }
      };
      // Calcular existencia final para este envase
      const inicial = Number(newTabla[envase].existenciaInicial) || 0;
      const recibido = Number(newTabla[envase].recibido) || 0;
      const consumo = Number(newTabla[envase].consumo) || 0;
      newTabla[envase].existenciaFinal = String(inicial + recibido - consumo);
      return newTabla;
    });
  };

  // Guardar datos en la base de datos
  const handleGuardar = async () => {
    // if (!seccionSeleccionada) {
    //   Alert.alert('Error', 'No se ha seleccionado una sección.');
    //   return;
    // }
    // Validar que al menos un envase tenga algún campo lleno
    const algunEnvaseLleno = envases.some(envase =>
      tabla[envase].existenciaInicial || tabla[envase].recibido || tabla[envase].consumo || tabla[envase].existenciaFinal
    );
    if (!algunEnvaseLleno) {
      Alert.alert('Error', 'Debes llenar al menos un envase antes de continuar.');
      return;
    }
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      for (const envase of envases) {
        // Solo guarda si hay algún campo lleno
        if (
          tabla[envase].existenciaInicial ||
          tabla[envase].recibido ||
          tabla[envase].consumo ||
          tabla[envase].existenciaFinal
        ) {
          const data: any = {
            caseta: seccionSeleccionada, // Siempre usa el valor del contexto
            fecha: fechaHoy,
            tipo: envase,
            inicial: Number(tabla[envase].existenciaInicial) || 0,
            recibido: Number(tabla[envase].recibido) || 0,
            consumo: Number(tabla[envase].consumo) || 0,
            final: Number(tabla[envase].existenciaFinal) || 0,
          };
          await DatabaseQueries.insertEnvase(data);
        }
      }
      Alert.alert('Éxito', 'Datos de envase guardados correctamente.');
      navigation.replace('Menu');
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos.');
    }
  };

  // Estado para controlar qué envases están abiertos
  const [envasesAbiertos, setEnvasesAbiertos] = useState<{ [envase: string]: boolean }>(() => {
    const obj: { [envase: string]: boolean } = {};
    envases.forEach(e => { obj[e] = false; });
    return obj;
  });

  const toggleEnvase = (envase: string) => {
    if (typeof LayoutAnimation !== 'undefined') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setEnvasesAbiertos(prev => ({ ...prev, [envase]: !prev[envase] }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.replace('Menu')}
        >
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ENVASE</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <Image
              source={require('../../assets/Iconos/envase.png')}
              style={styles.headerImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>{seccionSeleccionada} - {fechaHoy}</Text>
          </View>
          {envases.map((envase, idx) => (
            <View key={envase} style={[styles.casetaBlock, idx % 2 === 0 ? styles.casetaBlockEven : styles.casetaBlockOdd]}>
              <TouchableOpacity onPress={() => toggleEnvase(envase)} style={styles.casetaHeader} activeOpacity={0.7}>
                <Text style={styles.casetaTitle}>{envase}</Text>
                <Text style={styles.caret}>{envasesAbiertos[envase] ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {envasesAbiertos[envase] && (
                <View style={styles.casetaContent}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Existencia Inicial</Text>
                    <TextInput
                      style={styles.inputCell}
                      value={tabla[envase].existenciaInicial}
                      onChangeText={v => handleChange(envase, 'existenciaInicial', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Recibido</Text>
                    <TextInput
                      style={styles.inputCell}
                      value={tabla[envase].recibido}
                      onChangeText={v => handleChange(envase, 'recibido', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Consumo</Text>
                    <TextInput
                      style={styles.inputCell}
                      value={tabla[envase].consumo}
                      onChangeText={v => handleChange(envase, 'consumo', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Existencia Final</Text>
                    <TextInput
                      style={styles.inputCell}
                      value={tabla[envase].existenciaFinal}
                      onChangeText={v => handleChange(envase, 'existenciaFinal', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
          {/* Totales generales */}
          <View style={styles.totalesBlock}>
            <Text style={styles.totalesTitle}>Totales</Text>
            <View style={styles.totalesRow}>
              <Text style={styles.totalesCell}>Existencia Inicial: {totales.existenciaInicial}</Text>
              <Text style={styles.totalesCell}>Recibido: {totales.recibido}</Text>
              <Text style={styles.totalesCell}>Consumo: {totales.consumo}</Text>
              <Text style={styles.totalesCell}>Existencia Final: {totales.existenciaFinal}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar}>
            <Text style={styles.btnGuardarText}>Guardar y continuar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eaf1f9' },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold', margin: 12, textAlign: 'center', color: '#333' },
  table: { borderWidth: 1, borderColor: '#b0b0b0', borderRadius: 8, margin: 8, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  backButton: {
    padding: 6,
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2a3a4b',
    textAlign: 'center',
    flex: 1,
    letterSpacing: 1,
  },
  headerCell: { fontWeight: 'bold', fontSize: 13, padding: 6, minWidth: 90, textAlign: 'center', color: '#222' },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  casetaCell: { fontWeight: 'bold', fontSize: 13, minWidth: 110, textAlign: 'center', color: '#333' },
  inputCell: {
    borderWidth: 1.5,
    borderColor: '#b0b8c1',
    borderRadius: 8,
    width: 110,
    height: 40,
    margin: 4,
    paddingHorizontal: 12,
    textAlign: 'center',
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  btnGuardar: { backgroundColor: '#749BC2', borderRadius: 8, margin: 16, padding: 14, alignItems: 'center' },
  btnGuardarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  scrollContent: { paddingBottom: 30 },
  headerContainer: { alignItems: 'center', marginTop: 30, marginBottom: 10 },
  headerImage: { width: 48, height: 48, marginRight: 10 },
  subtitle: { fontSize: 15, color: '#333', marginBottom: 10, textAlign: 'center' },
  casetaBlock: { borderRadius: 10, margin: 10, padding: 0, elevation: 2, overflow: 'hidden' },
  casetaBlockEven: { backgroundColor: '#f4f8fd' },
  casetaBlockOdd: { backgroundColor: '#e0e7ef' },
  casetaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#c7d7ee' },
  casetaTitle: { fontSize: 16, fontWeight: 'bold', color: '#2a3a4b' },
  caret: { fontSize: 18, color: '#2a3a4b', marginLeft: 8 },
  casetaContent: { padding: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputLabel: { width: 120, fontWeight: '600', color: '#3b3b3b', fontSize: 13 },
  totalesBlock: { margin: 16, padding: 10, backgroundColor: '#dbeafe', borderRadius: 8 },
  totalesTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 6, color: '#2a3a4b' },
  totalesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
  totalesCell: { marginRight: 16, fontSize: 13, color: '#333' },
});
