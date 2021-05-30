var map;
const datasetName = 'Florence_PM10';
const wmsUrlTest = 'https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3AFlorence_PM10&styles=&format=image%2Fpng&transparent=true&version=1.1.1&time=2021-03-05T10:00:00.000Z&tiled=true&width=512&height=512&srs=EPSG%3A4326/{z}/{x}/{y}'
const wms = `https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3AFlorence_PM10&styles=&format=image%2Fpng&version=1.1.1&time=&tiled=true&width=256&height=256&srs=EPSG%3A4326/{z}/{x}/{y}`
const wms3 = `https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3A' + wmsDatasetName + '&styles=&format=image%2Fpng&version=1.1.1&time=' + timestampISO + '&tiled=true&width=' + tileSize + '&height=' + tileSize + '&srs=EPSG%3A4326/{z}/{x}/{y}'`;
const wms4 = `https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3AGRALheatmap&styles=&format=image%2Fpng&version=1.1.1&time=2021-05-28T07:00:00.000Z&tiled=true&width=256&height=256&srs=EPSG%3A4326/{z}/{x}/{y}`;
var darkmode = false;
const darkTileData = 'https://a.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=a120aa4adf4b4f92b72805b73035890a';
const lightTileData = 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png';
const cortiBuidlingData = 'http://127.0.0.1:5500/src/data/edificiFirenze.geojson';
const osmBuildingsData = 'https://{s}.data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json';
var layers;
var markers = [];

const florencePosition = {
    latitude: 43.769562,
    longitude: 11.255814,
};

function onLoad() {
    const mapLayer = createTileLayer(lightTileData);
    const buildingLayer = createBuildingLayer(cortiBuidlingData);
    layers = {
        map: mapLayer,
        building: buildingLayer,
    };

    map = new deck.DeckGL({
        mapStyle: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
        viewState: {
            ...florencePosition,
            zoom: 15
        },
        controller: true,
        container: 'map',
        layers: [
            mapLayer,
            buildingLayer
        ],
        onViewStateChange: ({ viewState }) => {
            const bb = getBoundingBox(viewState);
            console.log('new bbox:');
            console.log(bb);
            map.setProps({
                viewState: viewState,
            });
            return viewState;
        },
    });

    addEventListeners();
}

function createTileLayer(data, id = 'map-layer') {
    return new deck.TileLayer({
        id: id,
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
        data: data,

        minZoom: 0,
        maxZoom: 20,
        tileSize: 256,
        opacity: 1,
        pickable: true,

        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new deck.BitmapLayer(props, {
                data: null,
                image: props.data,
                bounds: [west, south, east, north]
            });
        },
        onClick: (info, event) => addMarker(info.coordinate),

    });

}

function createBuildingLayer(data, id = 'building-layer') {
    return new deck.GeoJsonLayer({
        id: id,
        data: data,
        extruded: true,
        pickable: true,
        stroked: false,
        filled: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [255, 102, 0, 200],
        getLineColor: [255, 255, 255],
        getElevation: f => f.properties.height,
        getRadius: 100,
        getLineWidth: 1,
    });
}


function createIconLayer(id = 'icon-layer') {
    const ICON_MAPPING = {
        marker: { x: 0, y: 0, width: 128, height: 128, mask: true }
    };

    return new deck.IconLayer({
        id: id,
        data: markers,
        pickable: true,
        iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
        iconMapping: ICON_MAPPING,
        getIcon: d => 'marker',

        sizeScale: 15,
        getPosition: d => d.coordinates,
        getSize: d => 5,
        getColor: d => d.color,
        parameters: {
            depthTest: false
        },
    });
}

function changeMapTiles() {
    darkmode = !darkmode;
    const mapLayer = darkmode ? createTileLayer(darkTileData) : createTileLayer(lightTileData);
    layers.map = mapLayer;

    updateLayers();
    updateTheme();
}

function addMarker(coordinate) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);

    markers.push({
        name: `marker-${markers.length}`,
        coordinates: coordinate,
        color: [r, g, b],
    });

    const iconLayer = createIconLayer(`icon-layer-${markers.length}`);
    layers.icon = iconLayer;

    updateLayers();
}

function updateLayers() {
    map.setProps({
        layers: [
            layers.map,
            layers.building,
            layers.icon,
        ]
    })
}

function getMaxBoundingBox(viewState) {
    const bb = getBoundingBox(viewState);
    var minLat = bb;
}

function getBoundingBox(viewState) {
    const viewport = new deck.WebMercatorViewport(viewState);
    const nw = viewport.unproject([0, 0]);
    const ne = viewport.unproject([0, viewport.height]);
    const se = viewport.unproject([viewport.width, viewport.height]);
    const sw = viewport.unproject([0, viewport.height]);
    return [nw, ne, se, sw];
}

function updateTheme() {
    const removeClass = darkmode ? 'light-btn' : 'dark-btn';
    const addClass = darkmode ? 'dark-btn' : 'light-btn';
    $('button').removeClass(removeClass);
    $('button').addClass(addClass);
}

function addEventListeners() {
    $('#changeMapBtn').on('click', changeMapTiles);
}

window.onload = onLoad;