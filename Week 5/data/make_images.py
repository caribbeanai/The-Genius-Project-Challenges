"""
Generate the Week 5 Caribbean image datasets, from a fixed random seed.

Two datasets are produced:
  1. caribbean_flags.npz  - simplified 32x32 colour flags of six Caribbean
                            nations, for the CNN flag classifier (Notebook 3, 5).
  2. satellite_tiles.npz  - 32x32 grayscale "satellite" tiles showing clear
                            skies, a tropical storm, or a hurricane, for the
                            hurricane-spotting CNN (Notebook 4).

The images are drawn with code, so they are believable teaching pictures, not
photographs of any real place. Small random noise, brightness, and shifts are
added so the network must learn real patterns, not memorise identical pixels.
"""
import numpy as np
import os

OUT = os.path.join(os.path.dirname(__file__), "week5_data")
os.makedirs(OUT, exist_ok=True)
S = 32   # image size (32 x 32 pixels)

# Colours as (R, G, B), 0-255.
GREEN = (0, 155, 76); GOLD = (255, 200, 0); BLACK = (30, 30, 30)
RED = (210, 30, 45); BLUE = (0, 70, 160); WHITE = (245, 245, 245)
AQUA = (0, 175, 200)


def _tri_mask(kind):
    """Boolean masks for the four triangles of a square (top/bottom/left/right)."""
    yy, xx = np.mgrid[0:S, 0:S]
    d1 = yy > xx            # below the main diagonal
    d2 = yy > (S - 1 - xx)  # below the anti-diagonal
    top = ~d1 & ~d2
    bottom = d1 & d2
    left = d1 & ~d2
    right = ~d1 & d2
    return {"top": top, "bottom": bottom, "left": left, "right": right}[kind]


def draw_flag(name, rng):
    """Draw one simplified Caribbean flag as a 32x32x3 image (values 0..1)."""
    img = np.zeros((S, S, 3), dtype=float)

    def fill(mask, colour):
        for c in range(3):
            img[:, :, c][mask] = colour[c] / 255.0

    yy, xx = np.mgrid[0:S, 0:S]
    if name == "Jamaica":
        # gold saltire (X): green top & bottom, black left & right
        fill(_tri_mask("top"), GREEN); fill(_tri_mask("bottom"), GREEN)
        fill(_tri_mask("left"), BLACK); fill(_tri_mask("right"), BLACK)
        band = (np.abs(yy - xx) < 3) | (np.abs(yy - (S - 1 - xx)) < 3)
        fill(band, GOLD)
    elif name == "Haiti":
        # two horizontal bands: blue over red
        fill(yy < S // 2, BLUE); fill(yy >= S // 2, RED)
    elif name == "Barbados":
        # three vertical bands: blue, gold, blue
        fill(xx < S // 3, BLUE); fill((xx >= S // 3) & (xx < 2 * S // 3), GOLD)
        fill(xx >= 2 * S // 3, BLUE)
    elif name == "Bahamas":
        # three horizontal bands aqua/gold/aqua + black triangle at hoist
        fill(yy < S // 3, AQUA); fill((yy >= S // 3) & (yy < 2 * S // 3), GOLD)
        fill(yy >= 2 * S // 3, AQUA)
        tri = xx < (S // 2) * (1 - np.abs(yy - (S - 1) / 2) / ((S - 1) / 2))
        fill(tri, BLACK)
    elif name == "Trinidad and Tobago":
        # red field with a white-edged black diagonal stripe
        fill(np.ones((S, S), bool), RED)
        diag = np.abs((yy) - (xx)) < 6
        fill(diag, WHITE)
        diag_black = np.abs((yy) - (xx)) < 3
        fill(diag_black, BLACK)
    elif name == "Guyana":
        # green field with a gold triangle and a red triangle from the hoist
        fill(np.ones((S, S), bool), GREEN)
        gold_tri = xx < (S - 1) * (1 - np.abs(yy - (S - 1) / 2) / ((S - 1) / 2))
        fill(gold_tri, GOLD)
        red_tri = xx < (S * 0.6) * (1 - np.abs(yy - (S - 1) / 2) / ((S - 1) / 2))
        fill(red_tri, RED)
    else:
        raise ValueError(name)

    # small random brightness and pixel noise so no two flags are identical
    img = img * rng.uniform(0.85, 1.05) + rng.normal(0, 0.03, img.shape)
    return np.clip(img, 0, 1)


def make_flags(per_class=350):
    names = ["Jamaica", "Haiti", "Barbados", "Bahamas",
             "Trinidad and Tobago", "Guyana"]
    rng = np.random.default_rng(5)
    X, y = [], []
    for label, name in enumerate(names):
        for _ in range(per_class):
            X.append(draw_flag(name, rng))
            y.append(label)
    # store pixels as 0..255 whole numbers (uint8) to keep the file small;
    # the notebooks divide by 255 to get 0..1 floats.
    X = np.clip(np.array(X) * 255, 0, 255).astype("uint8")
    y = np.array(y, dtype="int64")
    idx = rng.permutation(len(X))
    np.savez_compressed(os.path.join(OUT, "caribbean_flags.npz"),
                        X=X[idx], y=y[idx], class_names=np.array(names))
    print("flags:", X.shape, X.dtype, "classes:", names)


def make_satellite(per_class=400):
    """Grayscale 'satellite' tiles: clear, tropical storm, hurricane."""
    names = ["clear", "tropical_storm", "hurricane"]
    rng = np.random.default_rng(11)
    yy, xx = np.mgrid[0:S, 0:S]
    cx = cy = (S - 1) / 2
    X, y = [], []
    for label, name in enumerate(names):
        for _ in range(per_class):
            img = rng.normal(0.08, 0.03, (S, S))          # dark ocean background
            jx, jy = rng.uniform(-3, 3), rng.uniform(-3, 3)  # random centre wobble
            r = np.sqrt((xx - cx - jx) ** 2 + (yy - cy - jy) ** 2)
            theta = np.arctan2(yy - cy - jy, xx - cx - jx)
            if name == "clear":
                # a few scattered small clouds
                for _ in range(rng.integers(3, 9)):
                    sx, sy = rng.integers(0, S, 2)
                    blob = np.exp(-((xx - sx) ** 2 + (yy - sy) ** 2) / 6)
                    img += rng.uniform(0.3, 0.65) * blob
            elif name == "tropical_storm":
                # one big diffuse bright blob, no clear spiral (strength varies)
                img += rng.uniform(0.6, 0.9) * np.exp(-(r ** 2) / (2 * rng.uniform(6, 11) ** 2))
                # sometimes a faint hint of rotation, which makes it look storm-like
                img += 0.15 * np.clip(np.cos(theta - r * 0.5) * np.exp(-r / 12), 0, None)
            elif name == "hurricane":
                # a bright spiral of cloud bands + a calm dark "eye" (both vary,
                # so weak hurricanes can look a lot like strong storms)
                strength = rng.uniform(0.55, 1.0)
                spiral = np.cos(theta * 2 - r * rng.uniform(0.7, 1.0)) * np.exp(-r / 14)
                img += strength * np.clip(spiral, 0, None)
                img += 0.5 * np.exp(-(r ** 2) / (2 * 9 ** 2))            # cloud mass
                img -= rng.uniform(0.4, 0.7) * np.exp(-(r ** 2) / (2 * 2.4 ** 2))  # eye
            img += rng.normal(0, 0.05, (S, S))   # heavier sensor noise
            X.append(np.clip(img, 0, 1))
            y.append(label)
    X = np.clip(np.array(X) * 255, 0, 255).astype("uint8")[..., None]  # (N,32,32,1)
    y = np.array(y, dtype="int64")
    rng2 = np.random.default_rng(99)
    idx = rng2.permutation(len(X))
    np.savez_compressed(os.path.join(OUT, "satellite_tiles.npz"),
                        X=X[idx], y=y[idx], class_names=np.array(names))
    print("satellite:", X.shape, X.dtype, "classes:", names)


if __name__ == "__main__":
    make_flags()
    make_satellite()
    print("done ->", OUT)
