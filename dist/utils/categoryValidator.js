"use strict";
/**
 * Module: Backend (API Server)
 * File Purpose: Custom category-specific attribute validator.
 * Used By: AuthController, UserController
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCategoryAttributes = validateCategoryAttributes;
function validateCategoryAttributes(category, attributes) {
    if (!category) {
        return { status: true, cleanData: null };
    }
    if (attributes === null || attributes === undefined) {
        return { status: true, cleanData: null };
    }
    // If attributes is passed as a string (JSON representation), parse it
    let parsedAttrs = attributes;
    if (typeof attributes === 'string') {
        try {
            parsedAttrs = JSON.parse(attributes);
        }
        catch (e) {
            return { status: false, message: "Invalid JSON format for category_attributes" };
        }
    }
    if (typeof parsedAttrs !== 'object') {
        return { status: false, message: "category_attributes must be a JSON object" };
    }
    const cleanData = {};
    if (category === 'restaurant') {
        // Validate Restaurant fields
        if ('cuisine_type' in parsedAttrs && parsedAttrs.cuisine_type != null) {
            if (!Array.isArray(parsedAttrs.cuisine_type)) {
                return { status: false, message: "cuisine_type must be an array of strings" };
            }
            cleanData.cuisine_type = parsedAttrs.cuisine_type.map((c) => String(c).trim());
        }
        if ('is_veg_only' in parsedAttrs) {
            cleanData.is_veg_only = Boolean(parsedAttrs.is_veg_only);
        }
        if ('seating_capacity' in parsedAttrs) {
            const cap = Number(parsedAttrs.seating_capacity);
            if (isNaN(cap) || cap < 0) {
                return { status: false, message: "seating_capacity must be a valid non-negative number" };
            }
            cleanData.seating_capacity = cap;
        }
    }
    else if (category === 'salon') {
        // Validate Salon fields
        if ('services' in parsedAttrs && parsedAttrs.services != null) {
            if (!Array.isArray(parsedAttrs.services)) {
                return { status: false, message: "services must be an array of service items" };
            }
            const cleanServices = [];
            for (const service of parsedAttrs.services) {
                if (!service || typeof service !== 'object') {
                    return { status: false, message: "Each service item must be an object" };
                }
                if (!service.name || typeof service.name !== 'string') {
                    return { status: false, message: "Each service must have a valid string name" };
                }
                const price = Number(service.price);
                if (isNaN(price) || price < 0) {
                    return { status: false, message: `Price for service '${service.name}' must be a non-negative number` };
                }
                const duration = Number(service.duration_minutes || service.duration || 0);
                if (isNaN(duration) || duration < 0) {
                    return { status: false, message: `Duration for service '${service.name}' must be a non-negative number` };
                }
                const cleanService = {
                    name: service.name.trim(),
                    price: price,
                    duration_minutes: duration
                };
                if (service.description && typeof service.description === 'string') {
                    cleanService.description = service.description.trim();
                }
                if (service.add_ons && Array.isArray(service.add_ons)) {
                    cleanService.add_ons = service.add_ons
                        .filter((a) => a && a.name && typeof a.name === 'string')
                        .map((a) => ({
                        name: a.name.trim(),
                        price: Number(a.price) || 0
                    }));
                }
                cleanServices.push(cleanService);
            }
            cleanData.services = cleanServices;
        }
        if ('stylists' in parsedAttrs && parsedAttrs.stylists != null) {
            if (!Array.isArray(parsedAttrs.stylists)) {
                return { status: false, message: "stylists must be an array of names" };
            }
            cleanData.stylists = parsedAttrs.stylists.map((s) => String(s).trim());
        }
        if ('gender_support' in parsedAttrs) {
            const gender = String(parsedAttrs.gender_support).toLowerCase().trim();
            if (gender && !['men', 'women', 'unisex'].includes(gender)) {
                return { status: false, message: "gender_support must be one of 'men', 'women', or 'unisex'" };
            }
            cleanData.gender_support = gender || null;
        }
    }
    else if (category === 'turf') {
        // Validate Turf fields
        if ('turf_size' in parsedAttrs) {
            cleanData.turf_size = String(parsedAttrs.turf_size).trim();
        }
        if ('sport_types' in parsedAttrs && parsedAttrs.sport_types != null) {
            if (!Array.isArray(parsedAttrs.sport_types)) {
                return { status: false, message: "sport_types must be an array of strings" };
            }
            cleanData.sport_types = parsedAttrs.sport_types.map((s) => String(s).trim());
        }
        if ('ground_type' in parsedAttrs) {
            cleanData.ground_type = String(parsedAttrs.ground_type).trim();
        }
        if ('amenities' in parsedAttrs && parsedAttrs.amenities != null) {
            if (!Array.isArray(parsedAttrs.amenities)) {
                return { status: false, message: "amenities must be an array of strings" };
            }
            cleanData.amenities = parsedAttrs.amenities.map((a) => String(a).trim());
        }
        if ('services' in parsedAttrs && parsedAttrs.services != null) {
            if (!Array.isArray(parsedAttrs.services)) {
                return { status: false, message: "services must be an array of service items" };
            }
            const cleanServices = [];
            for (const service of parsedAttrs.services) {
                if (!service || typeof service !== 'object') {
                    return { status: false, message: "Each service item must be an object" };
                }
                if (!service.name || typeof service.name !== 'string') {
                    return { status: false, message: "Each service must have a valid string name" };
                }
                const price = Number(service.price);
                if (isNaN(price) || price < 0) {
                    return { status: false, message: `Price for service '${service.name}' must be a non-negative number` };
                }
                const duration = Number(service.duration_minutes || service.duration || 0);
                if (isNaN(duration) || duration < 0) {
                    return { status: false, message: `Duration for service '${service.name}' must be a non-negative number` };
                }
                const cleanService = {
                    name: service.name.trim(),
                    price: price,
                    duration_minutes: duration
                };
                if (service.description && typeof service.description === 'string') {
                    cleanService.description = service.description.trim();
                }
                if (service.add_ons && Array.isArray(service.add_ons)) {
                    cleanService.add_ons = service.add_ons
                        .filter((a) => a && a.name && typeof a.name === 'string')
                        .map((a) => ({
                        name: a.name.trim(),
                        price: Number(a.price) || 0
                    }));
                }
                cleanServices.push(cleanService);
            }
            cleanData.services = cleanServices;
        }
    }
    return { status: true, cleanData };
}
