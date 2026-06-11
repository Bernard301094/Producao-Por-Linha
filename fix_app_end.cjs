const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Find the position of removeEditParada={removeEditParada}
const marker = "          removeEditParada={removeEditParada}";
const markerIndex = content.lastIndexOf(marker);

if (markerIndex !== -1) {
  content = content.substring(0, markerIndex + marker.length) + `
          loadingEdit={loadingEdit}
          editParadaSelectedCode={editParadaSelectedCode}
          setEditParadaSelectedCode={setEditParadaSelectedCode}
          editParadaStart={editParadaStart}
          setEditParadaStart={setEditParadaStart}
          editParadaEnd={editParadaEnd}
          setEditParadaEnd={setEditParadaEnd}
          availableParadas={availableParadas}
        />
      )}

      {showProductManager && (
        <ProductManagerModal 
          open={showProductManager}
          onOpenChange={setShowProductManager}
          products={availableProducts}
          onRefresh={loadProducts}
        />
      )}

      {tourActive && (
        <TourOverlay
          isDesktop={isDesktop}
          setMobileTab={setMobileTab}
          onFinish={() => setTourActive(false)}
        />
      )}
    </>
  );
}
`;
}

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx final end fixed');
