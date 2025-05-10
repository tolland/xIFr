/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {expect} from 'chai';
import {getDataView} from './test-utils';
import {__RewireAPI__ as ImageHeaderHeicRewireAPI} from '../../src/image-header-heic';
import ImageHeaderHeic from '../../src/image-header-heic';

describe('image-header-heic', () => {
    afterEach(() => {
        ImageHeaderHeicRewireAPI.__ResetDependency__('parseBox');
        ImageHeaderHeicRewireAPI.__ResetDependency__('findOffsets');
    });

    it('should fail for too short data buffer', () => {
        const dataView = getDataView('\x00');
        expect(ImageHeaderHeic.isHeicFile(dataView)).to.be.false;
    });

    it('should fail for invalid image format', () => {
        const dataView = getDataView('------------');
        expect(ImageHeaderHeic.isHeicFile(dataView)).to.be.false;
    });

    it('should pass for valid image format', () => {
        ImageHeaderHeicRewireAPI.__Rewire__('parseBox', () => ({majorBrand: 'heic'}));
        const dataView = getDataView('');
        expect(ImageHeaderHeic.isHeicFile(dataView)).to.be.true;
    });

    describe('major brand recognition', () => {
        const majorBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1'];

        for (const brand of majorBrands) {
            it(`should find header offset in HEIC file with major brand ${brand}`, () => {
                // Totally fake the dependency.
                ImageHeaderHeicRewireAPI.__Rewire__('findOffsets', (_dataView) => ({[brand]: {hasAppMarkers: true}}[_dataView]));
                const dataView = brand;
                const appMarkerValues = ImageHeaderHeic.findHeicOffsets(dataView);
                expect(appMarkerValues.hasAppMarkers).to.be.true;
            });
        }
    });
});
