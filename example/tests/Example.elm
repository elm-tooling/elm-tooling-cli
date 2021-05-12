module Example exposing (..)

import Expect
import Test exposing (..)


suite : Test
suite =
    test "Math works" <|
        \_ ->
            (1 + 1)
                |> Expect.equal 2
