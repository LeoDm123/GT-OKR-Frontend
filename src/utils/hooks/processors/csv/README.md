# Procesador CSV Modularizado

## 🎯 Descripción

Este es el nuevo procesador CSV modularizado que **reemplaza completamente** al archivo monolítico `csvMMEXProcessor.ts`. La nueva estructura está organizada en módulos especializados para mejor mantenibilidad, escalabilidad y reutilización.

## 📁 Estructura de Módulos

```
/csv/
├── core/                    # Funcionalidades fundamentales
│   ├── csv.types.ts         # Tipos e interfaces
│   ├── csv.errors.ts        # Clases de errores y mensajes
│   ├── csv.utils.ts         # Utilidades generales
│   ├── csv.normalize.ts     # Normalización de datos
│   ├── csv.validators.ts    # Validaciones
│   └── index.ts            # Exportaciones del módulo core
│
├── parsers/                 # Parseo de datos CSV
│   ├── csv.line-parser.ts   # Parseo de líneas CSV
│   ├── csv.row-parser.ts    # Parseo de filas
│   ├── csv.mapping-parser.ts # Parseo con mapeo personalizado
│   └── index.ts            # Exportaciones del módulo parsers
│
├── transformers/            # Transformación de datos
│   ├── csv.row-to-movement.ts # Conversión de filas a movimientos
│   ├── csv.dataset-builder.ts # Construcción de datasets
│   ├── csv.batching.ts      # Procesamiento por lotes
│   └── index.ts            # Exportaciones del módulo transformers
│
├── io/                      # Entrada y salida de archivos
│   ├── csv.file-reader.ts   # Lectura de archivos
│   ├── csv.uploader.ts      # Carga de archivos
│   └── index.ts            # Exportaciones del módulo io
│
├── csv.processor.ts         # Procesador principal integrado
├── csvMMEXProcessor.new.ts  # Procesador específico para MMEX (reemplaza al original)
└── index.ts                # Índice principal con todas las exportaciones
```

## 🚀 Uso Básico

### Procesamiento Simple

```typescript
import { processCSVFilesStrict } from '@/utils/hooks/processors/csv'

// Procesar archivos con configuración estricta
const result = await processCSVFilesStrict(files, {
    datasetName: 'Mi Dataset',
    importedBy: 'usuario@email.com',
})

if (result.success) {
    console.log(`Dataset creado: ${result.dataset?.datasetName}`)
    console.log(`Movimientos procesados: ${result.statistics.totalMovements}`)
}
```

### Procesamiento con Mapeo Personalizado

```typescript
import { processCSVFilesWithMapping } from '@/utils/hooks/processors/csv'

const columnMapping = {
    date: 'fecha_transaccion',
    amount: 'monto',
    type: 'tipo_movimiento',
    category: 'categoria_gasto',
    notes: 'descripcion',
    beneficiary: 'destinatario',
    account: 'cuenta_bancaria',
    currency: 'moneda',
    number: 'numero_transaccion',
    status: 'estado',
}

const result = await processCSVFilesWithMapping(files, columnMapping, {
    datasetName: 'Dataset Personalizado',
    importedBy: 'admin@empresa.com',
})
```

### Procesamiento con Lotes

```typescript
import { processCSVFilesWithBatching } from '@/utils/hooks/processors/csv'

const batchConfig = {
    batchSize: 500,
    delayBetweenBatches: 2000,
    maxRetries: 3,
    retryDelay: 5000,
}

const result = await processCSVFilesWithBatching(files, batchConfig, {
    datasetName: 'Dataset Grande',
    importedBy: 'sistema@empresa.com',
})
```

## 🔧 Uso Avanzado

### Procesador Personalizado

```typescript
import { CSVProcessor } from '@/utils/hooks/processors/csv'

const processor = new CSVProcessor({
    fileConfig: {
        maxFileSizeMB: 50,
        allowedExtensions: ['csv', 'txt'],
        autoRead: true,
    },
    strictValidation: false,
    normalizeData: true,
    useBatching: true,
    batchConfig: {
        batchSize: 1000,
        delayBetweenBatches: 1000,
        maxRetries: 2,
        retryDelay: 3000,
    },
})

const result = await processor.processFiles(files)
```

### Procesador MMEX Específico

```typescript
import { MMEXCSVProcessor } from '@/utils/hooks/processors/csv/csvMMEXProcessor.new'

const mmexProcessor = new MMEXCSVProcessor({
    autoCreateDataset: true,
    batchSize: 1000,
    delayBetweenBatches: 2000,
    datasetName: 'Dataset MMEX',
    importedBy: 'usuario@mmex.com',
})

const result = await mmexProcessor.processAndUploadToAPI(files)

if (result.success) {
    console.log(`Dataset ID: ${result.datasetId}`)
    console.log(`Movimientos enviados: ${result.apiResults?.movementsAdded}`)
}
```

## 📊 Configuraciones Predefinidas

### CSVUploaderPresets

```typescript
import { CSVUploaderPresets } from '@/utils/hooks/processors/csv'

// Configuración estricta (archivos pequeños)
const strictConfig = CSVUploaderPresets.strict

// Configuración permisiva (archivos grandes)
const permissiveConfig = CSVUploaderPresets.permissive

// Configuración para múltiples archivos
const multipleConfig = CSVUploaderPresets.multiple

// Solo validación (sin lectura automática)
const validationOnlyConfig = CSVUploaderPresets.validationOnly
```

## 🔄 Migración Completada

### ✅ Estado Actual

- **Archivo original eliminado**: `csvMMEXProcessor.ts` ya no existe
- **Nueva estructura activa**: Todos los módulos están funcionando
- **Compatibilidad mantenida**: La función `processAndUploadCSV` sigue funcionando igual
- **Sin referencias rotas**: Todas las importaciones han sido actualizadas

### Función de Compatibilidad

La función `processAndUploadCSV` mantiene la misma interfaz que el sistema anterior:

```typescript
// Código anterior (sigue funcionando)
import { processAndUploadCSV } from '@/utils/hooks/processors/csv/csvMMEXProcessor.new'

const dataset = await processAndUploadCSV(
    file,
    datasetName,
    importedBy,
    datasetType,
    columnMapping,
    columnDefinitions,
)
```

### Próximos Pasos Opcionales

1. **Explorar nuevas funcionalidades**: Usar las funciones específicas como `processCSVFilesStrict()`
2. **Configurar procesamiento por lotes**: Para archivos grandes
3. **Implementar validaciones avanzadas**: Antes del procesamiento
4. **Adoptar el procesador personalizado**: Para casos complejos

## 🛠️ Desarrollo y Testing

### Validación de Archivos

```typescript
import { IO } from '@/utils/hooks/processors/csv'

// Validar archivos antes del procesamiento
const validation = IO.validateMultipleFilesForUpload(files, {
    maxFileSizeMB: 10,
    allowedExtensions: ['csv'],
})

if (!validation.isValid) {
    console.log('Archivos inválidos:', validation.errors)
}
```

### Información de Archivos

```typescript
import { IO } from '@/utils/hooks/processors/csv'

// Obtener información de archivos
const fileInfo = IO.getCSVFileInfo(file)
console.log(`Archivo: ${fileInfo.name}`)
console.log(`Tamaño: ${fileInfo.sizeFormatted}`)
console.log(`Tipo: ${fileInfo.type}`)
```

### Estimación de Tiempo

```typescript
import { CSVProcessor } from '@/utils/hooks/processors/csv'

const processor = new CSVProcessor()
const estimation = processor.estimateProcessingTime(files)

console.log(`Tiempo estimado: ${estimation.estimatedTimeMinutes} minutos`)
console.log(`Tamaño total: ${estimation.totalSize} bytes`)
```

## 🎯 Beneficios de la Nueva Estructura

1. **Modularidad**: Cada módulo tiene responsabilidades específicas
2. **Mantenibilidad**: Código organizado y fácil de mantener
3. **Escalabilidad**: Fácil agregar nuevas funcionalidades
4. **Reutilización**: Módulos independientes reutilizables
5. **Testing**: Cada módulo puede ser testeado individualmente
6. **Flexibilidad**: Múltiples configuraciones para diferentes casos de uso
7. **Robustez**: Manejo completo de errores en cada nivel
8. **Performance**: Procesamiento por lotes optimizado

## 🔍 Debugging y Logs

La nueva estructura incluye logging detallado en cada paso:

```typescript
// Los logs aparecerán en la consola del navegador
console.log('Iniciando procesamiento de X archivos CSV')
console.log('Archivos cargados: X/Y')
console.log('Dataset construido: X movimientos')
console.log('Enviando X movimientos en Y lotes')
console.log('Lote X enviado exitosamente')
```

## 📝 Notas Importantes

- La función `processAndUploadCSV` mantiene compatibilidad total con el código existente
- Los nuevos módulos son completamente independientes y pueden usarse por separado
- El procesamiento por lotes es opcional y se puede habilitar según sea necesario
- Todas las configuraciones tienen valores por defecto sensatos
- El sistema maneja errores de forma robusta en cada nivel del procesamiento
